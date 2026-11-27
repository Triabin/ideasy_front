<!-- 图片格式转换页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto no-scrollbar">
    <h1 class="w-full text-center text-3xl mt-2">图片格式转换</h1>
    <p class="text-sm opacity-70 text-center">
      支持 JPG / PNG / WebP / AVIF / BMP / GIF / TIFF 及相机 RAW（CR2、NEF、ARW、DNG 等）作为输入，
      输出 JPG / PNG / WebP / BMP；RAW 是传感器原始数据，常规格式无法无损还原，故不支持转回 RAW。
      全部转换在浏览器本地完成，图片不会上传。
    </p>

    <!-- 拖拽/点击上传区 -->
    <div class="rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center
                gap-2 py-8 px-4 border-base-300 hover:border-primary/60"
         @click="fileInputRef?.click()"
    >
      <ImgFormatCvter :size="40" :twClasses="['fill-base-content', 'opacity-60']"/>
      <p class="text-sm opacity-70">将图片拖到这里（或页面任意位置），或点击选择文件（支持多选与文件夹）</p>
      <p class="text-xs opacity-50">支持 JPG / PNG / WebP / AVIF / BMP / GIF / TIFF 及 RAW（CR2 / CR3 / NEF / ARW / DNG / RAF / ORF 等）</p>
      <input ref="fileInputRef" type="file" :accept="acceptAttr" multiple class="hidden" @change="onFileChange"/>
    </div>

    <!-- 转换设置 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">转换设置</h2>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <!-- 目标格式 -->
          <div class="shrink-0">
            <span class="opacity-60 mr-2">目标格式：</span>
            <div class="join inline-flex align-middle">
              <button
                  v-for="f in FORMATS" :key="f.value"
                  class="btn btn-sm join-item"
                  :class="{ 'btn-primary': target === f.value }"
                  :disabled="!encoders[f.value]"
                  :title="encoders[f.value] ? f.note : `当前浏览器不支持 ${f.label} 编码。${f.note}`"
                  @click="target = f.value"
              >{{ f.label }}</button>
              <button
                  class="btn btn-sm join-item"
                  disabled
                  title="RAW 是传感器原始数据（未去马赛克的拜耳阵列、完整位深与相机元数据），由 JPG/PNG 等格式无法还原这些信息，因此仅支持 RAW → 其他格式，不支持转回 RAW"
              >RAW</button>
            </div>
          </div>

          <!-- 有损质量 -->
          <div v-if="targetMeta.lossy" class="flex items-center gap-2 shrink-0">
            <span class="opacity-60">质量：</span>
            <input type="range" class="range range-xs range-primary w-36" min="50" max="100" step="1" v-model.number="qualityPct"/>
            <span class="font-mono text-xs w-9 text-right tabular-nums">{{ qualityPct }}%</span>
          </div>

          <!-- 透明填充色（目标不支持透明时） -->
          <div v-if="!targetMeta.alpha" class="flex items-center gap-2 shrink-0"
               :title="`${targetMeta.label} 不支持透明通道，透明区域将以该颜色填充`">
            <span class="opacity-60">透明填充：</span>
            <input type="color" class="w-8 h-8 rounded cursor-pointer border border-base-300 bg-base-100 p-0.5" v-model="bgColor"/>
            <span class="font-mono text-xs opacity-60">{{ bgColor }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button class="btn btn-primary btn-sm shrink-0" :disabled="!items.length || converting" @click="convertAll">
            {{ converting ? `转换中 ${doneInBatch}/${batchTotal}…` : `全部转换（${items.length}）` }}
          </button>
          <button class="btn btn-sm shrink-0" :disabled="!items.length || converting" @click="clearAll">清空</button>
          <button class="btn btn-sm shrink-0" :disabled="!doneItems.length || converting" @click="downloadAll">下载全部 ZIP</button>
          <span v-if="items.length" class="badge badge-outline font-mono shrink-0">共 {{ items.length }} 张 · 已完成 {{ doneItems.length }}</span>
        </div>

        <p v-if="hasRaw" class="text-xs opacity-50">
          RAW 解码由 dcraw（GPL-2.0）完成：解码为同步运算，大文件时页面可能短暂无响应；输出为 8bit sRGB 像素，EXIF 等元数据不会保留。
        </p>
        <p v-if="unsupportedLabels" class="text-xs text-warning">
          当前浏览器无法编码：{{ unsupportedLabels }}（对应按钮已禁用）。WebP 编码需要较新的 Firefox / Safari。
        </p>
      </div>
    </div>

    <!-- 文件列表 -->
    <div v-if="items.length" class="card bg-base-200 shadow-sm grow">
      <div class="card-body gap-2">
        <h2 class="card-title text-base">转换列表</h2>
        <div class="flex flex-col gap-1.5">
          <div v-for="item in items" :key="item.id"
               class="rounded-lg border bg-base-100 px-3 py-2 flex items-center gap-3"
               :class="item.status === 'error' ? 'border-error/50' : 'border-base-300'"
          >
            <!-- 缩略图（RAW 无法直接预览，显示占位） -->
            <img v-if="item.srcUrl" :src="item.srcUrl" alt="缩略图"
                 class="w-12 h-12 object-cover rounded border border-base-300 shrink-0 bg-base-200"/>
            <div v-else class="w-12 h-12 rounded border border-base-300 shrink-0 bg-base-200 flex items-center justify-center">
              <span class="badge badge-xs badge-soft badge-warning border-transparent font-mono">RAW</span>
            </div>

            <div class="flex flex-col min-w-0 gap-0.5 flex-1">
              <span class="text-sm font-medium truncate" :title="item.file.name">{{ item.file.name }}</span>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono opacity-70">
                <span class="badge badge-xs" :class="item.raw ? 'badge-soft badge-warning border-transparent' : 'badge-ghost'">{{ item.srcLabel }}</span>
                <span class="opacity-50">→</span>
                <span class="badge badge-xs badge-ghost">{{ targetMeta.label }}</span>
                <span v-if="item.width">{{ item.width }}×{{ item.height }}</span>
                <span>{{ formatBytes(item.file.size) }}</span>
                <template v-if="item.status === 'done' && item.result">
                  <span class="opacity-50">→</span>
                  <span>{{ formatBytes(item.result.size) }}</span>
                  <span :class="sizeDelta(item).cls">{{ sizeDelta(item).text }}</span>
                </template>
              </div>
              <span v-if="item.status === 'error'" class="text-xs text-error truncate" :title="item.error">{{ item.error }}</span>
              <span v-else-if="item.status === 'converting'" class="text-xs opacity-60">
                转换中…{{ item.raw ? '（RAW 解码较慢，页面可能短暂无响应）' : '' }}
              </span>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <span v-if="item.status === 'converting'" class="loading loading-spinner loading-sm text-primary"/>
              <button v-else class="btn btn-sm btn-ghost" @click="convertItem(item)">
                {{ item.status === 'done' ? '重新转换' : '转换' }}
              </button>
              <button class="btn btn-sm btn-ghost" :disabled="item.status !== 'done' || !item.result"
                      title="下载该文件" @click="item.result && downloadBlob(item.result.blob, item.result.name)"
              >下载</button>
              <button class="btn btn-sm btn-ghost px-2" title="移除" :disabled="converting" @click="removeItem(item)">✕</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 初始提示 -->
    <div v-if="!items.length" class="text-center opacity-40 py-4 text-sm">
      添加图片后选择目标格式，点击「全部转换」。转换在本地完成，可逐张下载或打包 ZIP。
    </div>
  </div>
</template>
<script lang="ts" setup>
import ImgFormatCvter from '@/components/icons/ImgFormatCvter.vue';
import { computed, onBeforeUnmount, ref } from 'vue';
import { popupToast } from '@/common/utils';
import useFullScreenDropFile from '@/composables/useFullScreenDropFile.ts';
import { downloadAsZip, downloadBlob, getBaseName, loadImageFromFile } from '../CompressImg/imageCompressor.ts';
import {
  FORMATS,
  RAW_EXTS,
  convertToFormat,
  detectEncoders,
  isRawFile,
  srcLabelOf,
  type TargetFormat,
} from './imageFormats.ts';
import { decodeRawFile } from './rawLoader.ts';

type ItemStatus = 'idle' | 'converting' | 'done' | 'error';
type Item = {
  id: number;
  file: File;
  /** 缩略图 objectURL（RAW 无法预览，为空串） */
  srcUrl: string;
  raw: boolean;
  srcLabel: string;
  width: number;
  height: number;
  status: ItemStatus;
  error: string;
  result: { blob: Blob; url: string; name: string; size: number } | null;
};

const fileInputRef = ref<HTMLInputElement>();
const items = ref<Item[]>([]);
let nextId = 1;

const target = ref<TargetFormat>('jpeg');
const qualityPct = ref<number>(92);
const bgColor = ref<string>('#ffffff');
const converting = ref<boolean>(false);
const doneInBatch = ref(0);
const batchTotal = ref(0);
/** 各格式编码支持探测结果（初始保守：仅恒可用格式为 true） */
const encoders = ref<Record<TargetFormat, boolean>>({ jpeg: true, png: true, webp: false, bmp: true });

const targetMeta = computed(() => FORMATS.find(f => f.value === target.value)!);
const doneItems = computed(() => items.value.filter(i => i.status === 'done' && i.result));
const hasRaw = computed(() => items.value.some(i => i.raw));
const unsupportedLabels = computed(() => FORMATS
    .filter(f => !encoders.value[f.value])
    .map(f => f.label)
    .join(' / '));
const acceptAttr = computed(() => `image/*,${RAW_EXTS.map(e => `.${e}`).join(',')}`);

// 探测浏览器编码能力；默认目标不支持时回退到 JPG
detectEncoders().then(support => {
  encoders.value = support;
  if (!support[target.value]) target.value = 'jpeg';
});

/** 字节数友好显示 */
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** 转换前后体积变化 */
function sizeDelta(item: Item): { text: string; cls: string } {
  if (!item.result) return { text: '', cls: '' };
  const delta = (item.result.size - item.file.size) / item.file.size * 100;
  const sign = delta >= 0 ? '+' : '';
  return {
    text: `${sign}${delta.toFixed(0)}%`,
    cls: delta <= 0 ? 'text-success' : 'text-warning',
  };
}

/** 添加文件到列表（RAW 无缩略图，常规图片异步加载缩略图与尺寸） */
async function addFiles(files: FileList | File[]) {
  const all = Array.from(files);
  const list = all.filter(f => f.type.startsWith('image/') || isRawFile(f)
      || /\.(jpe?g|png|webp|avif|gif|bmp|ico|tif?f|svg)$/i.test(f.name));
  const skipped = all.length - list.length;
  if (skipped > 0) popupToast(`已忽略 ${skipped} 个非图片文件`, { duration: 2000, type: 'warning' });
  for (const file of list) {
    const raw = isRawFile(file);
    items.value.push({
      id: nextId++, file, srcUrl: '', raw,
      srcLabel: raw ? 'RAW' : srcLabelOf(file),
      width: 0, height: 0, status: 'idle', error: '', result: null,
    });
    // 通过响应式代理修改，保证视图更新
    const added = items.value[items.value.length - 1];
    if (!raw) {
      loadImageFromFile(file).then(loaded => {
        added.srcUrl = loaded.srcUrl;
        added.width = loaded.width;
        added.height = loaded.height;
      }).catch(() => {
        // 缩略图加载失败不阻塞流程，转换时会再次解码并给出明确错误
      });
    }
  }
}

/** 文件选择回调 */
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) addFiles(input.files);
  input.value = '';
}

/** 转换单个文件（按当前全局设置） */
async function convertItem(item: Item) {
  const meta = targetMeta.value;
  if (!encoders.value[meta.value]) {
    popupToast(`当前浏览器不支持 ${meta.label} 编码`, { type: 'warning', duration: 2000 });
    return;
  }
  item.status = 'converting';
  item.error = '';
  try {
    // 让出一帧，确保 loading 状态先渲染
    await new Promise(r => setTimeout(r, 0));
    const decoded = item.raw
        ? await decodeRawFile(item.file)
        : (await loadImageFromFile(item.file)).img;
    const res = await convertToFormat(decoded, {
      target: target.value,
      quality: qualityPct.value / 100,
      bgColor: bgColor.value,
    });
    if (item.result?.url) URL.revokeObjectURL(item.result.url);
    item.result = {
      blob: res.blob,
      url: URL.createObjectURL(res.blob),
      name: getBaseName(item.file.name) + meta.ext,
      size: res.blob.size,
    };
    item.width = res.width;
    item.height = res.height;
    item.status = 'done';
  } catch (e: any) {
    item.status = 'error';
    item.error = e?.message ?? '转换失败';
  }
}

/** 按当前设置重新转换全部文件 */
async function convertAll() {
  if (converting.value || !items.value.length) return;
  converting.value = true;
  batchTotal.value = items.value.length;
  doneInBatch.value = 0;
  try {
    for (const item of items.value) {
      await convertItem(item);
      doneInBatch.value++;
    }
  } finally {
    converting.value = false;
  }
  const ok = items.value.filter(i => i.status === 'done').length;
  const fail = items.value.filter(i => i.status === 'error').length;
  if (fail > 0) {
    popupToast(`转换完成：成功 ${ok} 张，失败 ${fail} 张`, { type: 'warning', duration: 2500 });
  } else {
    popupToast(`转换完成：成功 ${ok} 张`, { type: 'success', duration: 1500 });
  }
}

/** 打包下载全部转换结果 */
async function downloadAll() {
  const files = doneItems.value.map(i => ({ blob: i.result!.blob, name: i.result!.name }));
  if (!files.length) return;
  try {
    await downloadAsZip(files, `converted_${Date.now()}.zip`);
  } catch (e: any) {
    popupToast(e?.message ?? '打包下载失败', { type: 'error', duration: 2500 });
  }
}

/** 移除单个文件 */
function removeItem(item: Item) {
  const idx = items.value.findIndex(i => i.id === item.id);
  if (idx < 0) return;
  if (item.srcUrl) URL.revokeObjectURL(item.srcUrl);
  if (item.result?.url) URL.revokeObjectURL(item.result.url);
  items.value.splice(idx, 1);
}

/** 清空列表 */
function clearAll() {
  items.value.forEach(i => {
    if (i.srcUrl) URL.revokeObjectURL(i.srcUrl);
    if (i.result?.url) URL.revokeObjectURL(i.result.url);
  });
  items.value = [];
}

onBeforeUnmount(clearAll);
useFullScreenDropFile(fileInputRef, {
  accept: (f: File) => f.type.startsWith('image/') || isRawFile(f)
      || /\.(jpe?g|png|webp|avif|gif|bmp|ico|tif?f|svg)$/i.test(f.name),
  maxSize: 200 * 1024 * 1024,
  overlayText: '松开鼠标，添加要转换格式的图片（支持 RAW 与文件夹）',
  onReject: (rejected, reason) => {
    if (reason === 'size') {
      popupToast(`已忽略超过 200MB 的文件：${rejected.map(f => f.name).join('、')}`, { duration: 2000, type: 'warning' });
    } else if (reason === 'type') {
      popupToast(`已忽略 ${rejected.length} 个非图片文件`, { duration: 2000, type: 'warning' });
    }
  },
});
</script>
