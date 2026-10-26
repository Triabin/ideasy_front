<!-- 图片压缩页面路由组件 -->
<template>
  <div id="img-compress" class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">图片压缩</h1>
    <p class="text-sm opacity-70 text-center">
      支持质量压缩、压缩到指定大小、最长边缩放与 JPG / WebP / PNG 格式转换，全部在浏览器本地完成，图片不会上传到任何服务器。
    </p>

    <!-- 拖拽/点击上传区 -->
    <div
        class="rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 py-8 px-4"
        :class="dragOver ? 'border-primary bg-base-200' : 'border-base-300 hover:border-primary/60'"
        @click="fileInputRef?.click()"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
    >
      <ImgCompress :size="40" :twClasses="['fill-base-content','opacity-60']"/>
      <p class="text-sm opacity-70">将图片拖到这里，或点击选择文件（支持多选）</p>
      <p class="text-xs opacity-50">支持 JPG / PNG / WebP / GIF / BMP / SVG 等常见格式</p>
      <input ref="fileInputRef" type="file" accept="image/*" multiple class="hidden" @change="onFileChange"/>
    </div>

    <!-- 压缩设置 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">压缩设置</h2>

        <!-- 模式切换：质量优先 / 指定大小 -->
        <div role="tablist" class="tabs tabs-box w-fit text-sm">
          <a role="tab" class="tab" :class="!targetSizeEnabled && 'tab-active'"
             @click="targetSizeEnabled = false">质量优先</a>
          <a role="tab" class="tab" :class="targetSizeEnabled && 'tab-active'"
             title="自动搜索参数，使每张输出图片不超过指定体积" @click="targetSizeEnabled = true">压缩到指定大小</a>
        </div>

        <div class="flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
          <!-- 输出格式 -->
          <div class="shrink-0">
            <span class="opacity-60 mr-2">输出格式：</span>
            <div class="btn-group inline-block align-middle">
              <button
                  v-for="f in FORMATS" :key="f.value"
                  class="btn btn-sm"
                  :class="format === f.value ? 'btn-primary' : ''"
                  :title="f.tip"
                  @click="format = f.value"
              >{{ f.label }}</button>
            </div>
          </div>

          <!-- 目标大小（仅“压缩到指定大小”模式） -->
          <div v-if="targetSizeEnabled" class="flex items-center gap-2 shrink-0">
            <span class="opacity-60">最大体积：</span>
            <input
                type="number"
                class="input input-sm w-28 font-mono"
                min="1" max="102400" step="1"
                v-model.number="targetSizeKB"
                title="每张压缩后图片允许的最大体积（KB），系统会自动调整质量与尺寸以满足限制"
            />
            <div class="btn-group inline-block align-middle">
              <button class="btn btn-sm" :class="targetSizeUnit === 'KB' && 'btn-primary'" @click="targetSizeUnit = 'KB'">KB</button>
              <button class="btn btn-sm" :class="targetSizeUnit === 'MB' && 'btn-primary'" @click="targetSizeUnit = 'MB'">MB</button>
            </div>
            <span class="text-xs opacity-50 hidden xl:inline">建议限定为 JPG / WebP，PNG 无法按质量压缩</span>
          </div>

          <!-- 质量滑块（仅“质量优先”模式） -->
          <label v-if="!targetSizeEnabled" class="grow min-w-60 max-w-md" :class="{ 'opacity-40 pointer-events-none': format === 'image/png' }"
                 :title="format === 'image/png' ? 'PNG为无损格式，质量设置无效' : ''">
            <span class="mb-1 block">压缩质量：<span class="font-mono">{{ Math.round(quality * 100) }}%</span></span>
            <input type="range" min="10" max="100" step="1" class="range range-sm range-primary w-full"
                   :value="Math.round(quality * 100)"
                   @input="quality = Number(($event.target as HTMLInputElement).value) / 100"/>
            <div class="flex justify-between text-xs opacity-50 px-1">
              <span>10%（更小）</span><span>100%（更清晰）</span>
            </div>
          </label>

          <!-- 尺寸缩放 -->
          <div class="flex items-center gap-2 shrink-0" :class="{ 'opacity-40 pointer-events-none': targetSizeEnabled }"
               :title="targetSizeEnabled ? '“压缩到指定大小”模式下会自动缩放图片，无需手动限制' : ''">
            <label class="label cursor-pointer gap-2">
              <input type="checkbox" class="checkbox checkbox-sm" v-model="resizeEnabled"/>
              <span class="label-text">限制最长边</span>
            </label>
            <input
                type="number"
                class="input input-sm w-28 font-mono"
                :class="{ 'opacity-50': !resizeEnabled }"
                min="16" max="10000" step="1"
                v-model.number="maxDimension"
                :disabled="!resizeEnabled || targetSizeEnabled"
                title="超过该像素的图片按比例缩小"
            />
            <span class="text-sm opacity-60">px</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex flex-wrap items-center gap-3">
          <button class="btn btn-primary btn-sm shrink-0" :disabled="!items.length || busy" @click="compressAll">
            {{ busy ? '压缩中…' : `开始压缩${checkedCount ? `（选中 ${checkedCount}）` : `（${items.length} 张）`}` }}
          </button>
          <button class="btn btn-sm shrink-0" :disabled="!items.length || busy" @click="checkAll(true)">全选</button>
          <button class="btn btn-sm shrink-0" :disabled="!items.length || busy" @click="checkAll(false)">全不选</button>
          <button class="btn btn-sm shrink-0" :disabled="!successItems.length || busy || zipping" @click="downloadChecked">
            <span v-if="zipping" class="loading loading-spinner loading-xs"></span>
            {{ zipping ? '打包中…' : '下载选中（ZIP）' }}
          </button>
          <button class="btn btn-sm btn-error/80 shrink-0" :disabled="!items.length || busy" @click="clearAll">清空列表</button>
          <span v-if="totalSaved !== null && successItems.length > 1" class="badge badge-outline font-mono shrink-0">
            总体积 -{{ totalSavedPercent.toFixed(1) }}%
          </span>
        </div>
      </div>
    </div>

    <!-- 图片列表 -->
    <div class="card bg-base-200 shadow-sm grow">
      <div class="card-body gap-2">
        <h2 class="card-title text-base">
          图片列表
          <span v-if="items.length" class="badge badge-outline font-mono">{{ items.length }}</span>
        </h2>
        <div v-if="!items.length" class="py-10 text-center opacity-50 text-sm">
          暂无图片，请在上方拖入或点击选择图片。
        </div>
        <ul v-else class="flex flex-col divide-y divide-base-300 overflow-y-auto pr-1">
          <li
              v-for="item in items" :key="item.id"
              class="flex items-center gap-3 py-2 px-1 text-sm min-w-0"
              :class="{ 'opacity-60': item.status === 'error' }"
          >
            <input type="checkbox" class="checkbox checkbox-sm shrink-0" v-model="item.checked" :disabled="busy"/>

            <!-- 缩略图（点击查看原图） -->
            <a :href="item.srcUrl" target="_blank" title="在新标签页查看原图" class="shrink-0">
              <img :src="item.srcUrl" alt="缩略图"
                   class="w-12 h-12 rounded object-cover bg-base-100 border border-base-300 hover:ring-2 ring-primary/50 transition"/>
            </a>

            <!-- 文件名 + 信息 -->
            <div class="min-w-0 grow">
              <p class="truncate font-medium" :title="item.file.name">{{ item.file.name }}</p>
              <p class="text-xs opacity-60 font-mono whitespace-nowrap">
                {{ item.width }}×{{ item.height }} · {{ fmtSize(item.file.size) }}
                <template v-if="item.result">
                  → {{ item.result.width }}×{{ item.result.height }} ·
                  <span :class="resultBadgeClass(item)">{{ fmtSize(item.result.blob.size) }}（{{ diffText(item) }}）</span>
                  <span v-if="targetSizeEnabled && item.result.withinTarget === false" class="text-warning">· 未达标</span>
                </template>
              </p>
            </div>

            <!-- 状态徽章 -->
            <span v-if="item.status === 'busy'" class="loading loading-spinner loading-sm shrink-0"></span>
            <span v-else-if="item.status === 'error'" class="badge badge-error/20 text-error shrink-0 max-w-40 truncate" :title="item.error">
              {{ item.error || '失败' }}
            </span>
            <span v-else-if="item.status === 'done'" class="badge badge-success/20 text-success shrink-0">✓</span>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-1 shrink-0">
              <button class="btn btn-xs btn-primary" :disabled="busy || item.status === 'busy'" @click="compressOne(item)">
                {{ item.result ? '重压' : '压缩' }}
              </button>
              <button class="btn btn-xs" :disabled="!item.result" @click="downloadOne(item)">下载</button>
              <button class="btn btn-xs btn-ghost text-error" title="移除该图片" :disabled="busy" @click="removeItemById(item.id)">✕</button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ImgCompress from '@/components/icons/ImgCompress.vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { popupTip } from '@/common/utils';
import {
  compressImage,
  downloadAsZip,
  downloadBlob,
  getBaseName,
  loadImageFromFile,
  type CompressResult,
  type LoadedImage,
  type OutputFormat,
} from './imageCompressor';

/** 列表项状态 */
type ItemStatus = 'idle' | 'busy' | 'done' | 'error';

/** 列表项数据 */
type ListItem = LoadedImage & {
  /** 唯一id */
  id: number;
  /** 状态 */
  status: ItemStatus;
  /** 是否被勾选 */
  checked: boolean;
  /** 压缩结果 */
  result?: CompressResult;
  /** 错误信息 */
  error?: string;
};

/** 可选输出格式 */
const FORMATS: { value: OutputFormat; label: string; tip: string }[] = [
  { value: 'original', label: '原格式', tip: 'JPG/PNG保持原格式；GIF/SVG无法重编码，直接复制原文件' },
  { value: 'image/jpeg', label: 'JPG', tip: '有损压缩，不支持透明（透明区域铺白底）' },
  { value: 'image/webp', label: 'WebP', tip: '同质量下体积通常小于JPG，支持透明' },
  { value: 'image/png', label: 'PNG', tip: '无损格式，体积一般比JPG大，适合需要保留细节/透明的场景' },
];

let nextId = 1;

/** 文件输入框引用 */
const fileInputRef = ref<HTMLInputElement>();
/** 是否拖拽悬停中 */
const dragOver = ref<boolean>(false);
/** 列表数据 */
const items = ref<ListItem[]>([]);
/** 输出格式 */
const format = ref<OutputFormat>('original');
/** 压缩质量 */
const quality = ref<number>(0.8);
/** 是否启用最长边缩放 */
const resizeEnabled = ref<boolean>(false);
/** 最长边像素 */
const maxDimension = ref<number>(1920);
/** 是否启用“压缩到指定大小”模式 */
const targetSizeEnabled = ref<boolean>(false);
/** 目标体积数值（按 targetSizeUnit 解释） */
const targetSizeKB = ref<number>(200);
/** 目标体积单位 */
const targetSizeUnit = ref<'KB' | 'MB'>('KB');
/** 是否有任务正在进行 */
const busy = ref<boolean>(false);
/** 是否正在打包下载 */
const zipping = ref<boolean>(false);
/** 目标体积（字节），由数值与单位换算，兜底最小1KB */
const targetSizeBytes = computed(() => {
  const v = Math.trunc(targetSizeKB.value) || 0;
  const bytes = targetSizeUnit.value === 'MB' ? v * 1024 * 1024 : v * 1024;
  return Math.max(1024, bytes);
});

/**
 * 模式联动：切换到“压缩到指定大小”时，若当前格式为原格式/PNG则自动改为JPG
 * （该模式依赖按质量调节的有损编码，PNG/GIF/SVG难以达标）
 */
watch(targetSizeEnabled, (on) => {
  if (on && (format.value === 'original' || format.value === 'image/png')) {
    format.value = 'image/jpeg';
  }
});

/** 勾选中的项 */
const checkedItems = computed(() => items.value.filter(i => i.checked));
/** 勾选项数量 */
const checkedCount = computed(() => checkedItems.value.length);
/** 压缩成功的项 */
const successItems = computed(() => items.value.filter(i => i.status === 'done' && i.result));

/** 总体积节省率（基于所有成功项，无可计算时为null） */
const totalSaved = computed<number | null>(() => {
  if (successItems.value.length < 1) return null;
  const src = successItems.value.reduce((s, i) => s + i.file.size, 0);
  const dst = successItems.value.reduce((s, i) => s + (i.result?.blob.size ?? 0), 0);
  return src - dst;
});
const totalSavedPercent = computed(() => {
  const src = successItems.value.reduce((s, i) => s + i.file.size, 0);
  return src ? ((totalSaved.value ?? 0) / src) * 100 : 0;
});

/**
 * 格式化文件大小
 * @param bytes {number} 字节数
 */
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024, ui = 0;
  while (v >= 1024 && ui < units.length - 1) {
    v /= 1024;
    ui++;
  }
  return `${v.toFixed(v >= 100 || ui === 0 ? 0 : 1)} ${units[ui]}`;
}

/**
 * 生成单张图片的体积变化描述
 * @param item {ListItem} 列表项
 */
function diffText(item: ListItem): string {
  if (!item.result) return '';
  const src = item.file.size, dst = item.result.blob.size;
  if (!src) return '';
  const pct = ((dst - src) / src) * 100;
  return `${pct <= 0 ? '-' : '+'}${Math.abs(pct).toFixed(1)}%`;
}

/**
 * 压缩结果体积文字的颜色样式
 * @param item {ListItem} 列表项
 */
function resultBadgeClass(item: ListItem): string {
  if (!item.result) return '';
  if (targetSizeEnabled.value) {
    return item.result.withinTarget === false ? 'text-warning' : 'text-success';
  }
  return item.result.blob.size < item.file.size ? 'text-success' : 'text-warning';
}

/**
 * 添加图片文件到列表
 * @param files {FileList | File[]} 文件列表
 */
async function addFiles(files: FileList | File[]) {
  const all = Array.from(files);
  const list = all.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|ico|avif|svg)$/i.test(f.name));
  const skipped = all.length - list.length;
  if (skipped > 0) popupTip(`已忽略 ${skipped} 个非图片文件`, 'warning', 2000);
  for (const file of list) {
    try {
      const loaded = await loadImageFromFile(file);
      items.value.push({ ...loaded, id: nextId++, status: 'idle', checked: true });
    } catch {
      popupTip(`图片 "${file.name}" 解码失败，已跳过`, 'error', 2500);
    }
  }
}

/** 文件选择回调 */
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) addFiles(input.files);
  input.value = '';
}

/** 拖放回调 */
function onDrop(e: DragEvent) {
  dragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files?.length) addFiles(files);
}

/**
 * 获取当前压缩选项
 */
function currentOptions() {
  return {
    quality: quality.value,
    format: format.value,
    resizeEnabled: resizeEnabled.value,
    maxDimension: maxDimension.value,
    targetSizeEnabled: targetSizeEnabled.value,
    targetSizeBytes: targetSizeBytes.value,
  };
}

/**
 * 释放旧的压缩结果objectURL
 * @param item {ListItem} 列表项
 */
function revokeResult(item: ListItem) {
  if (item.result?.url) URL.revokeObjectURL(item.result.url);
  item.result = undefined;
}

/**
 * 压缩单个图片（内部实现，不控制全局busy状态）
 * @param item {ListItem} 列表项
 */
async function runCompress(item: ListItem) {
  // 重新压缩前释放上一次结果的objectURL，防止内存泄漏
  revokeResult(item);
  item.status = 'busy';
  item.error = undefined;
  try {
    const result = await compressImage(item, currentOptions());
    if (result.error) {
      item.status = 'error';
      item.error = result.error;
    } else {
      // 预览地址由组件创建并负责释放（compressImage内部不再创建）
      result.url = URL.createObjectURL(result.blob);
      item.result = result;
      item.status = 'done';
    }
  } catch (e) {
    console.error('图片压缩异常', e);
    item.status = 'error';
    item.error = e instanceof Error ? e.message : String(e);
  }
}

/**
 * 从列表中移除指定项并释放其占用的资源
 * @param id {number} 列表项id
 */
function removeItemById(id: number) {
  const idx = items.value.findIndex(i => i.id === id);
  if (idx < 0) return;
  const item = items.value[idx];
  URL.revokeObjectURL(item.srcUrl);
  revokeResult(item);
  items.value.splice(idx, 1);
}

/**
 * 校验压缩参数是否合法，非法时提示并返回false
 */
function validateOptions(): boolean {
  if (targetSizeEnabled.value) {
    const v = Math.trunc(targetSizeKB.value) || 0;
    if (v < 1) {
      popupTip('最大体积需设置为不小于 1 的数值', 'warning');
      return false;
    }
  }
  if (!targetSizeEnabled.value && resizeEnabled.value) {
    const m = Math.trunc(maxDimension.value) || 0;
    if (m < 16) {
      popupTip('最长边限制需在 16 ~ 10000 px 之间', 'warning');
      return false;
    }
  }
  return true;
}

/** 单张“压缩/重压”按钮入口 */
async function compressOne(item: ListItem) {
  if (busy.value || item.status === 'busy') return;
  if (!validateOptions()) return;
  busy.value = true;
  try {
    await runCompress(item);
  } finally {
    busy.value = false;
  }
}

/** 批量压缩：勾选了则只压选中的，否则压全部 */
async function compressAll() {
  if (busy.value) return;
  if (!validateOptions()) return;
  // 基于当前快照筛选目标项；过程中被移除的图片会自动跳过
  const targetIds = new Set(
      (checkedCount.value ? checkedItems.value : items.value).map(i => i.id),
  );
  if (!targetIds.size) {
    popupTip('请先添加或勾选要压缩的图片', 'warning');
    return;
  }
  busy.value = true;
  let done = 0, failed = 0;
  try {
    for (const id of targetIds) {
      const item = items.value.find(i => i.id === id);
      if (!item) continue; // 已被用户移除
      await runCompress(item);
      if (item.status === 'error') failed++;
      else done++;
    }
  } finally {
    // 无论中途是否出现异常，都必须复位busy，避免界面按钮被永久禁用
    busy.value = false;
  }
  if (!done) {
    popupTip(`压缩失败：共 ${failed} 张，请检查图片或调整参数后重试`, 'error', 3000);
  } else if (failed) {
    popupTip(`压缩完成：成功 ${done} 张，失败 ${failed} 张`, 'warning', 2500);
  } else {
    popupTip(`压缩完成：共 ${done} 张，可点击下载按钮保存`, 'success', 2000);
  }
}

/**
 * 生成输出文件名
 * @param item {ListItem} 列表项
 */
function outName(item: ListItem): string {
  const ext = item.result?.ext ?? 'jpg';
  return `${getBaseName(item.file.name)}_压缩.${ext}`;
}

/**
 * 下载单张压缩结果
 * @param item {ListItem} 列表项
 */
function downloadOne(item: ListItem) {
  if (!item.result) return;
  downloadBlob(item.result.blob, outName(item));
}

/** 下载所有勾选且压缩成功的图片（多张时打包为一个ZIP统一下载，单张直接下载） */
async function downloadChecked() {
  if (zipping.value) return;
  // 只下载压缩成功的图片，避免把未压缩的勾选项算进来后误报“没有可下载的结果”
  const targets = successItems.value.filter(i => checkedCount.value ? i.checked : true);
  if (!targets.length) {
    popupTip('没有可下载的压缩结果，请先勾选图片并点击“开始压缩”', 'warning');
    return;
  }
  zipping.value = true;
  try {
    await downloadAsZip(
        targets.map(item => ({ blob: item.result!.blob, name: outName(item) })),
        `压缩图片_${targets.length}张`,
    );
    if (targets.length > 1) popupTip(`已打包 ${targets.length} 张图片为ZIP下载`, 'success', 2000);
  } catch (e) {
    console.error('批量下载失败', e);
    popupTip('打包下载失败，请尝试逐张下载', 'error', 2500);
  } finally {
    zipping.value = false;
  }
}

/**
 * 全选/全不选
 * @param val {boolean} 勾选值
 */
function checkAll(val: boolean) {
  items.value.forEach(i => i.checked = val);
}

/** 清空整个列表 */
function clearAll() {
  items.value.forEach(i => {
    URL.revokeObjectURL(i.srcUrl);
    revokeResult(i);
  });
  items.value = [];
}

onBeforeUnmount(clearAll);
</script>
