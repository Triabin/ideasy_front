<!-- 图片取色盘工具路由页面 -->
<template>
  <div class="w-full relative flex flex-col gap-4 p-4 overflow-y-auto" :style="rootStyle">
    <h1 class="w-full text-center text-3xl mt-2">图片取色盘</h1>
    <p class="text-sm opacity-70 text-center">
      上传一张图片，逐像素统计其中各种颜色的数量，按占比生成一套配色方案；
      可将配色应用到渐变、色块与示例界面预览。全部分析在浏览器本地完成，图片不会上传。
    </p>

    <!-- 拖拽/点击上传区 -->
    <div v-if="!image"
         class="rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center
                gap-2 py-10 px-4 border-base-300 hover:border-primary/60"
         :class="{ 'pointer-events-none opacity-60': analyzing }"
         @click="fileInputRef?.click()"
    >
      <span v-if="analyzing" class="loading loading-spinner loading-md text-primary"/>
      <ImgPalette v-else :size="40" :twClasses="['fill-base-content', 'opacity-60']"/>
      <p class="text-sm opacity-70">{{ analyzing ? '正在分析图片…' : '将图片拖到这里（或页面任意位置），或点击选择文件' }}</p>
      <p class="text-xs opacity-50">支持 JPG / PNG / WebP / GIF / BMP / SVG 等常见格式</p>
    </div>
    <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange"/>

    <template v-if="image && buckets">
      <!-- 图片信息与选项 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body p-3 flex-row flex-wrap items-center gap-3">
          <img :src="image.srcUrl" alt="图片缩略图"
               class="w-20 h-20 object-cover rounded-box border border-base-300 shrink-0 bg-base-100"/>
          <div class="flex flex-col gap-1 min-w-0 text-sm">
            <span class="font-semibold truncate" :title="image.name">{{ image.name }}</span>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-60 font-mono">
              <span>{{ image.width }} × {{ image.height }}</span>
              <span title="参与统计的不透明像素数（超大图按最长边等比缩小采样）">采样 {{ buckets.opaquePixels.toLocaleString() }} px</span>
              <span>色种 {{ buckets.uniqueColors.toLocaleString() }}</span>
              <span v-if="buckets.transparentPixels">跳过透明 {{ buckets.transparentPixels.toLocaleString() }} px</span>
            </div>
          </div>
          <div class="ml-auto flex flex-wrap items-center gap-2 shrink-0">
            <span class="text-xs opacity-60">配色数量</span>
            <div class="join">
              <button v-for="n in COLOR_COUNTS" :key="n"
                      class="btn btn-sm join-item" :class="{ 'btn-primary': maxColors === n }"
                      @click="maxColors = n"
              >{{ n }}</button>
            </div>
            <button class="btn btn-sm" @click="fileInputRef?.click()">重新选择</button>
            <button class="btn btn-sm btn-ghost" @click="clearImage">清除</button>
          </div>
        </div>
      </div>

      <!-- 无可统计像素（如全透明图片） -->
      <div v-if="!palette.length" class="alert alert-warning text-sm">
        <span>这张图片没有可统计的不透明像素（可能是全透明图），无法提取配色，换一张试试吧。</span>
      </div>

      <!-- 色盘结果 -->
      <div v-if="palette.length" class="card bg-base-200 shadow-sm">
        <div class="card-body p-3 gap-2">
          <div class="flex flex-wrap items-center gap-2 px-1">
            <h2 class="card-title text-base">色盘结果</h2>
            <span class="badge badge-ghost badge-sm font-mono">按像素数量排序 · {{ palette.length }} 色</span>
            <div class="ml-auto flex items-center gap-1">
              <CopyBtn :value="allHexText" label="复制全部HEX" title="复制全部颜色（HEX，换行分隔）" popup-toast="on"/>
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <div v-for="(c, i) in palette" :key="c.hex + i"
                 class="rounded-box overflow-hidden border border-base-300 bg-base-100">
              <!-- 大色块：点击复制 -->
              <div class="h-20 relative cursor-pointer"
                   :style="{ backgroundColor: c.hex }"
                   :title="`点击复制 ${c.hex}`"
                   @click="copyHex(c.hex)"
              >
                <span class="absolute top-1.5 left-1.5 badge badge-sm border-0 font-mono font-bold bg-black/35 text-white">{{ i + 1 }}</span>
              </div>
              <div class="p-2 flex flex-col gap-1">
                <div class="flex items-center justify-between gap-1">
                  <span class="font-mono text-sm font-bold">{{ c.hex }}</span>
                  <CopyBtn :value="c.hex" title="复制 HEX" popup-toast="on"/>
                </div>
                <span class="text-xs opacity-55 font-mono">rgb({{ c.r }}, {{ c.g }}, {{ c.b }})</span>
                <span class="text-xs opacity-55 font-mono">{{ hslText(c) }}</span>
                <!-- 占比进度条 -->
                <div class="h-1.5 rounded-full bg-base-300 overflow-hidden mt-0.5">
                  <div class="h-full rounded-full" :style="{ width: `${c.percent}%`, backgroundColor: c.hex }"/>
                </div>
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="opacity-70">{{ c.count.toLocaleString() }} px</span>
                  <span class="opacity-50">{{ c.percent.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>
          <p class="text-xs opacity-40 px-1">
            像素数量基于采样统计（最长边超过 {{ maxSampleEdge }}px 的图片会先等比缩小），百分比按不透明像素计算。
          </p>
        </div>
      </div>

      <!-- 配色应用预览 -->
      <div v-if="palette.length" class="card bg-base-200 shadow-sm">
        <div class="card-body p-3 gap-3">
          <div class="flex flex-wrap items-center gap-2 px-1">
            <h2 class="card-title text-base">应用到背景预览</h2>
            <div role="tablist" class="tabs tabs-box w-fit text-sm ml-2">
              <a role="tab" class="tab" :class="bgMode === 'gradient' && 'tab-active'" @click="bgMode = 'gradient'">渐变背景</a>
              <a role="tab" class="tab" :class="bgMode === 'blocks' && 'tab-active'" @click="bgMode = 'blocks'">占比色块</a>
              <a role="tab" class="tab" :class="bgMode === 'ui' && 'tab-active'" @click="bgMode = 'ui'">示例界面</a>
            </div>
            <button class="btn btn-sm ml-auto" :class="{ 'btn-primary': bgApplied }"
                    :title="bgApplied ? '还原本页面背景' : '将配色渐变应用到整个页面背景（叠加半透明底色保证可读性）'"
                    @click="bgApplied = !bgApplied"
            >{{ bgApplied ? '✓ 已应用到页面背景，点击还原' : '应用到页面背景' }}</button>
          </div>

          <!-- 渐变背景 -->
          <template v-if="bgMode === 'gradient'">
            <div class="h-36 rounded-box border border-base-300" :style="{ background: gradientCss }"/>
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="opacity-60 break-all flex-1">background: {{ gradientCss }};</span>
              <CopyBtn :value="cssGradientText" label="复制" title="复制渐变 CSS" popup-toast="on"/>
            </div>
          </template>

          <!-- 占比色块：宽度与像素占比成正比 -->
          <div v-else-if="bgMode === 'blocks'" class="h-36 flex rounded-box overflow-hidden border border-base-300">
            <div v-for="c in palette" :key="'blk' + c.hex"
                 class="h-full flex flex-col items-center justify-center gap-1 overflow-hidden cursor-pointer"
                 :style="{ flexGrow: c.percent, flexBasis: 0, backgroundColor: c.hex, color: textOn(c) }"
                 :title="`${c.hex} · ${c.count.toLocaleString()} px · ${c.percent.toFixed(1)}%，点击复制`"
                 @click="copyHex(c.hex)"
            >
              <span class="text-xs font-mono font-bold whitespace-nowrap">{{ c.hex }}</span>
              <span class="text-xs font-mono whitespace-nowrap opacity-80">{{ c.percent.toFixed(1) }}%</span>
            </div>
          </div>

          <!-- 示例界面：主色作背景，文字按对比度自动取黑/白 -->
          <div v-else class="rounded-box overflow-hidden border border-base-300"
               :style="{ backgroundColor: pal(0).hex, color: textOn(pal(0)) }">
            <!-- 顶栏 -->
            <div class="flex items-center gap-2 px-4 py-2.5"
                 :style="{ backgroundColor: pal(1).hex, color: textOn(pal(1)) }">
              <span class="font-bold text-sm">My App</span>
              <span class="flex gap-1 ml-2">
                <span v-for="c in palette.slice(2)" :key="'dot' + c.hex"
                      class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: c.hex }"/>
              </span>
              <span class="ml-auto text-xs px-2.5 py-1 rounded-btn font-semibold"
                    :style="{ backgroundColor: pal(2).hex, color: textOn(pal(2)) }">操作</span>
            </div>
            <!-- 正文 -->
            <div class="p-4 flex flex-col gap-3">
              <div class="text-base font-bold">标题文字预览 Aa 123</div>
              <p class="text-sm leading-relaxed">
                正文文字预览：The quick brown fox jumps over the lazy dog. 0123456789。
                此区域以图片中出现最多的颜色为背景，文字颜色按 WCAG 相对亮度自动选取黑或白。
              </p>
              <div class="flex flex-wrap gap-2">
                <span v-for="(c, i) in palette.slice(0, 6)" :key="'btn' + c.hex"
                      class="text-xs px-3 py-1.5 rounded-btn font-semibold"
                      :style="{ backgroundColor: c.hex, color: textOn(c) }">按钮 {{ i + 1 }}</span>
              </div>
              <div class="flex flex-wrap gap-1">
                <span v-for="c in palette" :key="'tag' + c.hex"
                      class="badge badge-sm border-0 font-mono"
                      :style="{ backgroundColor: c.hex, color: textOn(c) }">{{ c.hex }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 初始提示 -->
    <div v-if="!image" class="text-center opacity-40 py-4 text-sm">
      色盘按「量化分桶 → 像素计数 → 相近色加权合并」提取：先统计每种颜色的像素数量，再按数量排序合并成指定数量的配色，
      相近的颜色（RGB 距离 ≤ 40）会自动归并为同一色。
    </div>
  </div>
</template>
<script lang="ts" setup>
import CopyBtn from '@/components/CopyBtn';
import ImgPalette from '@/components/icons/ImgPalette.vue';
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue';
import { copyText, popupToast } from '@/common/utils';
import useFullScreenDropFile from '@/composables/useFullScreenDropFile.ts';
import { loadImageFromFile } from '../CompressImg/imageCompressor.ts';
import { relativeLuminance, rgbToHsl } from '../ColorCvter/colorConverter.ts';
import {
  MAX_SAMPLE_EDGE,
  buildBuckets,
  buildPalette,
  sampleImage,
  type ColorBuckets,
  type PaletteColor,
} from './palette.ts';

/** 可选的配色数量 */
const COLOR_COUNTS = [4, 6, 8, 10, 12, 16];
/** 预览方式 */
type BgMode = 'gradient' | 'blocks' | 'ui';

const maxSampleEdge = MAX_SAMPLE_EDGE;
const fileInputRef = ref<HTMLInputElement>();
const analyzing = ref<boolean>(false);
/** 当前图片信息（null 表示未加载） */
const image = ref<{ name: string; srcUrl: string; width: number; height: number } | null>(null);
/** 像素统计桶（大数组，用 shallowRef 避免深响应式） */
const buckets = shallowRef<ColorBuckets | null>(null);
const maxColors = ref<number>(8);
const bgMode = ref<BgMode>('gradient');
const bgApplied = ref<boolean>(false);

/** 色盘结果（调整配色数量时自动重算，无需重新读图） */
const palette = computed<PaletteColor[]>(() => buckets.value ? buildPalette(buckets.value, maxColors.value) : []);
/** 按索引安全取色（不足时回退到最后一个） */
const pal = (i: number): PaletteColor => palette.value[Math.min(i, palette.value.length - 1)];

/** 全部颜色的 HEX 列表（换行分隔） */
const allHexText = computed(() => palette.value.map(c => c.hex).join('\n'));
/** 色盘渐变 CSS */
const gradientCss = computed(() => {
  const n = palette.value.length;
  if (!n) return '';
  const stops = n === 1
      ? `${palette.value[0].hex}, ${palette.value[0].hex}`
      : palette.value.map((c, i) => `${c.hex} ${(i / (n - 1) * 100).toFixed(1)}%`).join(', ');
  return `linear-gradient(135deg, ${stops})`;
});
const cssGradientText = computed(() => `background: ${gradientCss.value};`);

/** 「应用到页面背景」时给根容器叠加：半透明主题底色 + 色盘渐变，保证文字可读 */
const rootStyle = computed(() => {
  if (!bgApplied.value || !gradientCss.value) return undefined;
  const veil = 'color-mix(in srgb, var(--color-base-100) 72%, transparent)';
  return {
    backgroundImage: `linear-gradient(${veil}, ${veil}), ${gradientCss.value}`,
    backgroundAttachment: 'local',
  };
});

/** 根据背景色亮度选取可读文字颜色（WCAG 相对亮度） */
const textOn = (c: PaletteColor): string => relativeLuminance({ ...c, a: 1 }) >= 0.179 ? '#111111' : '#FFFFFF';

const hslText = (c: PaletteColor): string => {
  const { h, s, l } = rgbToHsl(c.r, c.g, c.b);
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const copyHex = async (hex: string) => {
  try {
    await copyText(hex);
    popupToast(`已复制 ${hex}`, { type: 'success', duration: 1200 });
  } catch (e: any) {
    popupToast(e?.message ?? '复制失败', { type: 'error', duration: 2500 });
  }
};

/** 解码图片 → 采样 → 统计色桶 */
async function analyzeFile(file: File) {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp|ico|avif|svg)$/i.test(file.name)) {
    popupToast(`已忽略非图片文件 "${file.name}"`, { type: 'warning', duration: 2000 });
    return;
  }
  if (analyzing.value) return;
  analyzing.value = true;
  let loaded;
  try {
    loaded = await loadImageFromFile(file);
  } catch {
    popupToast(`图片 "${file.name}" 解码失败`, { type: 'error', duration: 2500 });
    analyzing.value = false;
    return;
  }
  try {
    const data = sampleImage(loaded.img);
    const oldUrl = image.value?.srcUrl;
    buckets.value = buildBuckets(data);
    image.value = { name: file.name, srcUrl: loaded.srcUrl, width: loaded.width, height: loaded.height };
    if (oldUrl) URL.revokeObjectURL(oldUrl);
  } catch (e: any) {
    URL.revokeObjectURL(loaded.srcUrl);
    popupToast(e?.message ?? '图片分析失败', { type: 'error', duration: 2500 });
  } finally {
    analyzing.value = false;
  }
}

/** 文件选择回调（仅取第一张） */
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) analyzeFile(file);
  input.value = '';
}

/** 清除当前图片 */
function clearImage() {
  if (image.value) URL.revokeObjectURL(image.value.srcUrl);
  image.value = null;
  buckets.value = null;
  bgApplied.value = false;
}

onBeforeUnmount(() => {
  if (image.value) URL.revokeObjectURL(image.value.srcUrl);
});

useFullScreenDropFile(fileInputRef, {
  accept: 'image/*',
  maxSize: 50 * 1024 * 1024,
  maxCount: 1,
  overlayText: '松开鼠标，分析图片配色',
  onReject: (rejected, reason) => {
    if (reason === 'size') {
      popupToast(`已忽略超过 50MB 的图片：${rejected.map(f => f.name).join('、')}`, { duration: 2000, type: 'warning' });
    } else if (reason === 'type') {
      popupToast(`已忽略 ${rejected.length} 个非图片文件`, { duration: 2000, type: 'warning' });
    }
  },
});
</script>
