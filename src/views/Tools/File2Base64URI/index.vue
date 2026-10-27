<!-- 文件转Base64URI路由页面组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">文件转Base64URI</h1>
    <p class="text-sm opacity-70 text-center">
      将文件转换为Base64DataURI格式，全部在浏览器本地完成，文件不会上传到任何服务器。内置文件体积告警体系，超限文件可强制运行。
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
      <Base64Edit :size="40" :twClasses="['fill-base-content','opacity-60']"/>
      <p class="text-sm opacity-70">将文件拖到这里，或点击选择文件（支持多选）</p>
      <p class="text-xs opacity-50">任意类型文件均可转换；添加后会自动按体积告警体系进行分级提示</p>
      <input ref="fileInputRef" type="file" multiple class="hidden" @change="onFileChange"/>
    </div>

    <!-- 告警体系设置 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">
          体积告警设置
          <span class="badge badge-outline badge-sm font-mono" title="预估输出长度 = 文件大小 × 4 / 3 + 头部开销">
            膨胀系数 ≈ 1.37×
          </span>
        </h2>
        <div class="flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
          <div class="flex items-center gap-2">
            <span class="opacity-60 shrink-0">提示阈值：</span>
            <input type="number" class="input input-sm w-24 font-mono" min="1" step="1" v-model.number="infoMB"
                   title="超过该体积的文件会给出“体积偏大”的提示，但仍可直接转换（MB）"/>
            <span class="opacity-60">MB</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="opacity-60 shrink-0">警告阈值：</span>
            <input type="number" class="input input-sm w-24 font-mono" min="1" step="1" v-model.number="warnMB"
                   title="超过该体积的文件转换前会弹出确认框，确认后方可继续（MB）"/>
            <span class="opacity-60">MB</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="opacity-60 shrink-0 text-error">危险阈值：</span>
            <input type="number" class="input input-sm w-24 font-mono" min="1" step="1" v-model.number="dangerMB"
                   title="超过该体积的文件默认被拦截，必须勾选“允许强制运行”或逐次确认后才能转换（MB）"/>
            <span class="opacity-60">MB</span>
          </div>
          <label class="label cursor-pointer gap-2" title="开启后，超过危险阈值的文件不再弹窗逐个确认，直接批量强制转换">
            <input type="checkbox" class="checkbox checkbox-sm" v-model="allowForce"/>
            <span class="label-text">允许强制运行（跳过危险级确认）</span>
          </label>
        </div>
        <p v-if="thresholdInvalid" class="text-xs text-error">
          阈值需满足：提示 &lt; 警告 &lt; 危险，且均不小于 1MB，当前配置不合法，已按默认值执行。
        </p>
        <div class="alert alert-info text-xs py-2">
          <span>
            告警体系说明：≤ 提示阈值直接转换；提示~警告之间给出提醒后仍可转换；警告~危险之间转换前需二次确认；
            超过危险阈值默认拦截并标记为“需强制”，勾选“允许强制运行”或点击“强制转换”确认后即可照常执行。
          </span>
        </div>
      </div>
    </div>

    <!-- 危险级确认模态框 -->
    <dialog ref="modalRef" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span class="badge badge-error shrink-0">!</span>
          文件过大告警
        </h3>
        <p class="py-3 text-sm">
          以下 {{ pendingItems.length }} 个文件超过危险阈值（{{ dangerMB || '-' }} MB），转换可能耗时很久、
          占用大量内存，甚至导致页面无响应或被浏览器中断：
        </p>
        <ul class="text-xs font-mono bg-base-200 rounded-lg p-3 max-h-40 overflow-y-auto flex flex-col gap-1">
          <li v-for="it in pendingItems" :key="it.id" class="truncate" :title="it.file.name">
            {{ it.file.name }} · {{ MyFileUtils.fmtByteSize(it.file.size) }} → 约 {{ MyFileUtils.fmtByteSize(estimateLen(it.file.size)) }}
          </li>
        </ul>
        <label class="label cursor-pointer justify-start gap-2 mt-3 text-sm">
          <input type="checkbox" class="checkbox checkbox-sm checkbox-error" v-model="forceChecked"/>
          <span class="label-text">我已了解风险，强制运行本次转换</span>
        </label>
        <div class="modal-action">
          <button class="btn btn-sm" @click="closeModal(false)">取消</button>
          <button class="btn btn-sm btn-error" :disabled="!forceChecked" @click="closeModal(true)">
            强制转换（{{ pendingItems.length }}）
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal(false)">关闭</button>
      </form>
    </dialog>

    <!-- 文件列表 -->
    <div class="card bg-base-200 shadow-sm grow">
      <div class="card-body gap-2">
        <div class="flex flex-row items-center justify-between gap-2">
          <h2 class="flex-1 card-title text-base">
            文件列表
            <span v-if="items.length" class="badge badge-outline font-mono">{{ items.length }}</span>
            <span v-if="dangerCount" class="badge badge-error/20 text-error font-mono">需强制 {{ dangerCount }}</span>
          </h2>
          <!-- 批量操作按钮 -->
          <div v-if="items.length" class="flex-1 ml-20 flex flex-wrap items-center gap-3 pt-2 border-base-300">
            <button class="btn btn-sm btn-primary shrink-0" :disabled="!items.length || busy" @click="convertAll">
              {{ busy ? '转换中…' : `全部转换${forceAllEnabled ? '（含强制）' : ''}` }}
            </button>
            <button class="btn btn-sm btn-error/80 shrink-0" :disabled="!items.length || busy" @click="clearAll">清空列表</button>
            <span v-if="lastSummary" class="text-xs opacity-60 font-mono">{{ lastSummary }}</span>
          </div>
          <div class="italic text-xs opacity-60">⚠️&nbsp;浏览器地址栏有长度限制，超出长度后，Base64DataURI会被截取导致预览失败！</div>
        </div>
        <div v-if="!items.length" class="py-10 text-center opacity-50 text-sm">
          暂无文件，请在上方拖入或点击选择文件。
        </div>
        <ul v-else class="flex flex-col divide-y divide-base-300 overflow-y-auto pr-1">
          <li
              v-for="item in items" :key="item.id"
              class="flex flex-col gap-2 py-2 px-1 text-sm min-w-0"
          >
            <div class="flex items-center gap-3 min-w-0">
              <!-- 文件图标/预览 -->
              <img v-if="isImage(item)" :src="previewUrl(item)" alt="缩略图"
                   class="w-10 h-10 rounded object-cover bg-base-100 border border-base-300 shrink-0"/>
              <span v-else class="w-10 h-10 rounded bg-base-300 flex items-center justify-center shrink-0 text-xs font-mono uppercase opacity-70"
                    :title="item.result?.mimeType ?? MyFileUtils.getMimeType(item.file)">
                {{ extOf(item.file.name) || '?' }}
              </span>

              <!-- 文件名 + 信息 -->
              <div class="min-w-0 grow">
                <p class="truncate font-medium" :title="item.file.name">{{ item.file.name }}</p>
                <p class="text-xs opacity-60 font-mono whitespace-nowrap">
                  {{ MyFileUtils.fmtByteSize(item.file.size) }} · {{ item.result?.mimeType ?? MyFileUtils.getMimeType(item.file) }}
                  <template v-if="item.result">→ 输出 {{ MyFileUtils.fmtByteSize(item.result.uri.length) }}（{{ item.result.uri.length.toLocaleString() }} 字符）</template>
                </p>
              </div>

              <!-- 告警徽章 -->
              <span class="badge badge-sm shrink-0 font-mono" :class="alertBadgeClass(item)"
                    :title="alertTitle(item)">{{ alertText(item) }}</span>

              <!-- 状态 -->
              <span v-if="item.status === 'busy'" class="loading loading-spinner loading-sm shrink-0"></span>
              <span v-else-if="item.status === 'error'" class="badge badge-error/20 text-error shrink-0 max-w-40 truncate" :title="item.error">
                {{ item.error || '失败' }}
              </span>
              <span v-else-if="item.status === 'done'" class="badge badge-success/20 text-success shrink-0">✓</span>

              <!-- 操作按钮 -->
              <div class="flex items-center gap-1 shrink-0">
                <button class="btn btn-xs btn-primary" :disabled="busy || item.status === 'busy'"
                        :class="{ 'btn-error': item.level === 'danger' }"
                        :title="item.level === 'danger' ? '超过危险阈值，点击后强制转换' : '转换为 Base64 DataURI'"
                        @click="convertOne(item)">
                  {{ item.level === 'danger' ? (item.result ? '再强制转' : '强制转换') : (item.result ? '重新转换' : '转换') }}
                </button>
                <button class="btn btn-xs" :disabled="!item.result" @click="copyResult(item)">复制</button>
                <button class="btn btn-xs" :disabled="!item.result" @click="item.result && clickDownload(item.result.uri, 'text/plain', () => `${item.file.name}.base64uri.txt`)">下载txt</button>
                <a v-if="item.result && isImage(item)" :href="item.result.uri" target="_blank"
                   class="btn btn-xs btn-ghost" title="在新标签页通过DataURI打开预览">预览</a>
                <button class="btn btn-xs btn-ghost text-error" title="移除该文件" :disabled="busy" @click="removeItem(item.id)">✕</button>
              </div>
            </div>

            <!-- 进度条 -->
            <progress v-if="item.status === 'busy'" class="progress progress-primary w-full h-1.5 shrink-0"
                      :value="item.progress" max="1"></progress>

            <!-- 结果展示 -->
            <div v-if="item.result" class="flex flex-col gap-1 ml-13 min-w-0">
              <textarea
                  readonly
                  class="textarea textarea-sm textarea-bordered font-mono text-xs w-full h-24 bg-base-100"
                  spellcheck="false"
                  :value="displayUri(item)"
                  @focus="($event.target as HTMLTextAreaElement).select()"
              ></textarea>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-60 font-mono">
                <span>总长度：{{ item.result.uri.length.toLocaleString() }} 字符</span>
                <span>前缀：<span class="opacity-90">{{ headOf(item.result.uri) }}</span></span>
                <span v-if="item.result.chunked" class="text-warning" title="FileReader 读取失败，已自动改用分块读取方案">分块模式</span>
                <label v-if="item.result.uri.length > 2000" class="label cursor-pointer gap-1 m-0">
                  <input type="checkbox" class="toggle toggle-xs" v-model="item.truncated"/>
                  <span class="label-text">截断显示（复制/下载仍为完整内容）</span>
                </label>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Base64Edit from '@/components/icons/Base64Edit.vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { copyText, MyFileUtils, popupTip, clickDownload } from '@/common/utils';
import {
  type ConvertResult,
  type ConvertStatus,
  type SizeAlertLevel,
  fileToBase64URI,
  getSizeAlertLevel,
} from './file2Base64URI.ts';

/** 列表项数据 */
interface ListItem {
  id: number;
  file: File;
  status: ConvertStatus;
  /** 当前告警级别（随阈值设置实时计算） */
  level: SizeAlertLevel;
  /** 转换进度 0~1 */
  progress: number;
  /** 是否截断显示结果 */
  truncated: boolean;
  result?: ConvertResult;
  error?: string;
}

/** 默认阈值（MB） */
const DEFAULT_INFO = 1, DEFAULT_WARN = 5, DEFAULT_DANGER = 20;

let nextId = 1;

/** 文件输入引用 */
const fileInputRef = ref<HTMLInputElement>();
/** 模态框引用 */
const modalRef = ref<HTMLDialogElement>();
/** 拖拽悬停 */
const dragOver = ref<boolean>(false);
/** 列表 */
const items = ref<ListItem[]>([]);
/** 是否有任务进行中 */
const busy = ref<boolean>(false);
/** 允许强制运行开关 */
const allowForce = ref<boolean>(false);
/** 阈值（MB） */
const infoMB = ref<number>(DEFAULT_INFO);
const warnMB = ref<number>(DEFAULT_WARN);
const dangerMB = ref<number>(DEFAULT_DANGER);
/** 待确认的危险级文件 */
const pendingItems = ref<ListItem[]>([]);
/** 模态框中的强制确认勾选 */
const forceChecked = ref<boolean>(false);
/** 上次批量转换摘要 */
const lastSummary = ref<string>('');

/** 阈值是否非法（未严格递增或小于1） */
const thresholdInvalid = computed(() => {
  const i = infoMB.value, w = warnMB.value, d = dangerMB.value;
  return !(i >= 1 && w > i && d > w);
});

/** 实际生效的阈值（字节）：非法时回退默认值 */
const thresholds = computed(() => {
  const fallback = thresholdInvalid.value;
  return {
    infoThreshold: (fallback ? DEFAULT_INFO : infoMB.value) * 1024 * 1024,
    warnThreshold: (fallback ? DEFAULT_WARN : warnMB.value) * 1024 * 1024,
    dangerThreshold: (fallback ? DEFAULT_DANGER : dangerMB.value) * 1024 * 1024,
  };
});
/** 危险级文件数量 */
const dangerCount = computed(() => items.value.filter(i => i.level === 'danger').length);
/** “全部转换”是否处于免确认强制模式 */
const forceAllEnabled = computed(() => allowForce.value && dangerCount.value > 0);
/** 按当前阈值重新计算所有文件的告警级别 */
const refreshLevels = () => items.value.forEach(i => (i.level = getSizeAlertLevel(i.file.size, thresholds.value)));

// 阈值变化时实时刷新每个文件的告警级别
watch(thresholds, refreshLevels);

/**
 * 预估输出字符串长度（base64 每3字节编码为4字符，另加 data 头开销）
 * @param size {number} 文件字节数
 */
const estimateLen = (size: number): number => Math.ceil(size / 3) * 4 + 64;

/**
 * 判断是否为图片文件（SVG不走缩略图逻辑）
 * @param item {ListItem} 列表项
 */
const isImage = (item: ListItem): boolean => MyFileUtils.getMimeType(item.file)
    .startsWith('image/') && !/\.svg$/i.test(item.file.name);

/** 图片缩略图 objectURL 缓存 */
const previewCache = new Map<number, string>();

/**
 * 生成图片预览地址（objectURL，避免提前整读大文件）
 * @param item {ListItem} 列表项
 */
const previewUrl = (item: ListItem): string => {
  let url = previewCache.get(item.id);
  if (!url) {
    url = URL.createObjectURL(item.file);
    previewCache.set(item.id, url);
  }
  return url;
}

/**
 * 获取文件扩展名
 * @param name {string} 文件名
 */
function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1] : '';
}

/** 告警徽章样式 */
function alertBadgeClass(item: ListItem): string {
  switch (item.level) {
    case 'danger': return 'badge-error text-error-content';
    case 'warning': return 'badge-warning text-warning-content';
    case 'info': return 'badge-info text-info-content';
    default: return 'badge-success opacity-80';
  }
}

/** 告警徽章文字 */
function alertText(item: ListItem): string {
  switch (item.level) {
    case 'danger': return '危险·需强制';
    case 'warning': return '警告';
    case 'info': return '偏大';
    default: return '安全';
  }
}

/** 告警悬浮说明 */
function alertTitle(item: ListItem): string {
  const est = MyFileUtils.fmtByteSize(estimateLen(item.file.size));
  switch (item.level) {
    case 'danger': return `超过危险阈值 ${dangerMB.value}MB，输出约 ${est}，默认拦截，可强制运行`;
    case 'warning': return `超过警告阈值 ${warnMB.value}MB，输出约 ${est}，转换前需确认`;
    case 'info': return `超过提示阈值 ${infoMB.value}MB，输出约 ${est}，建议仅用于本地调试`;
    default: return `体积在安全范围内，输出约 ${est}`;
  }
}

/**
 * 提取 DataURI 头部（data:...;base64, 部分）用于展示
 * @param uri {string} 完整 DataURI
 */
function headOf(uri: string): string {
  const idx = uri.indexOf(',');
  if (idx < 0) return uri.slice(0, 48) + '…';
  const head = uri.slice(0, idx + 1);
  return head.length > 64 ? head.slice(0, 64) + '…' : head;
}

/**
 * 展示用 URI（超长时截断显示，但复制/下载始终使用完整内容）
 * @param item {ListItem} 列表项
 */
function displayUri(item: ListItem): string {
  const uri = item.result?.uri ?? '';
  if (!item.truncated || uri.length <= 2000) return uri;
  return `${uri.slice(0, 1000)}\n……（此处省略 ${uri.length - 1600} 个字符，完整内容请使用复制/下载）……\n${uri.slice(-600)}`;
}

/**
 * 添加文件到列表，并按告警体系即时提示
 * @param files {FileList | File[]} 文件集合
 */
function addFiles(files: FileList | File[]) {
  let infoCnt = 0, warnCnt = 0, dangerCnt = 0;
  for (const file of Array.from(files)) {
    const level = getSizeAlertLevel(file.size, thresholds.value);
    items.value.push({ id: nextId++, file, status: 'idle', level, progress: 0, truncated: true });
    if (level === 'info') infoCnt++;
    else if (level === 'warning') warnCnt++;
    else if (level === 'danger') dangerCnt++;
  }
  // 添加阶段的汇总告警（只提示，不阻断）
  if (dangerCnt) popupTip(`有 ${dangerCnt} 个文件超过危险阈值（${dangerMB.value}MB），将被拦截，需强制运行`, 'error', 3500);
  else if (warnCnt) popupTip(`有 ${warnCnt} 个文件超过警告阈值（${warnMB.value}MB），转换前需确认`, 'warning', 3000);
  else if (infoCnt) popupTip(`有 ${infoCnt} 个文件体积偏大，输出 Base64 后长度约为原文件的 1.37 倍`, 'dash', 3000);
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
 * 执行单个文件的转换（内部方法，不做告警拦截）
 * @param item {ListItem} 列表项
 */
async function runConvert(item: ListItem) {
  item.status = 'busy';
  item.error = undefined;
  item.progress = 0;
  try {
    item.result = await fileToBase64URI(item.file, (r) => (item.progress = r));
    item.status = 'done';
  } catch (e) {
    console.error('文件转换失败', e);
    item.status = 'error';
    item.error = e instanceof Error ? e.message : String(e);
    popupTip(`"${item.file.name}" 转换失败：${item.error}`, 'error', 3000);
  }
}

/** 关闭模态框并决定是否继续强制转换 */
function closeModal(confirmed: boolean) {
  modalRef.value?.close();
  const targets = pendingItems.value.splice(0, pendingItems.value.length);
  forceChecked.value = false;
  if (!confirmed) {
    popupTip('已取消危险级文件的转换', 'dash', 2000);
    return;
  }
  void (async () => {
    busy.value = true;
    try {
      for (const it of targets) await runConvert(it);
    } finally {
      busy.value = false;
    }
    popupTip(`已完成 ${targets.length} 个危险级文件的强制转换`, 'success', 2500);
  })();
}

/**
 * 单个文件“转换/强制转换”入口：按告警级别分流处理
 * @param item {ListItem} 列表项
 */
async function convertOne(item: ListItem) {
  if (busy.value || item.status === 'busy') return;
  refreshLevels();
  const level = item.level;
  if (level === 'danger' && !allowForce.value) {
    // 危险级：默认拦截，弹出确认框（勾选后方可强制运行）
    pendingItems.value = [item];
    forceChecked.value = false;
    modalRef.value?.showModal();
    return;
  }
  if (level === 'warning') {
    const ok = window.confirm(
      `"${item.file.name}"（${MyFileUtils.fmtByteSize(item.file.size)}）已超过警告阈值，` +
      `预计输出约 ${MyFileUtils.fmtByteSize(estimateLen(item.file.size))} 字符。\n\n点击“确定”继续转换（强制运行），点击“取消”中止。`,
    );
    if (!ok) {
      popupTip('已取消该文件的转换', 'dash', 2000);
      return;
    }
  }
  busy.value = true;
  try {
    await runConvert(item);
  } finally {
    busy.value = false;
  }
}

/** 全部转换：普通文件直接转，危险级文件进入统一确认流程 */
async function convertAll() {
  if (busy.value || !items.value.length) return;
  refreshLevels();
  const normal = items.value.filter(i => i.level !== 'danger');
  const dangers = items.value.filter(i => i.level === 'danger');
  busy.value = true;
  let done = 0, failed = 0;
  try {
    for (const it of normal) {
      await runConvert(it);
      if (it.status === 'error') failed++; else done++;
    }
  } finally {
    busy.value = false;
  }
  if (dangers.length) {
    if (allowForce.value) {
      // 免确认强制模式：直接批量转换危险级文件
      busy.value = true;
      try {
        for (const it of dangers) {
          await runConvert(it);
          if (it.status === 'error') failed++; else done++;
        }
      } finally {
        busy.value = false;
      }
      popupTip(`已强制转换 ${dangers.length} 个危险级文件`, 'success', 2500);
    } else {
      // 弹出统一确认模态框
      pendingItems.value = [...dangers];
      forceChecked.value = false;
      modalRef.value?.showModal();
    }
  }
  lastSummary.value = `本次转换：成功 ${done}，失败 ${failed}${dangers.length ? `，危险级 ${dangers.length}` : ''}`;
}

/**
 * 复制转换结果（始终为完整 URI）
 * @param item {ListItem} 列表项
 */
async function copyResult(item: ListItem) {
  if (!item.result) return;
  try {
    await copyText(item.result.uri);
    popupTip(`已复制 "${item.file.name}" 的完整 DataURI（${item.result.uri.length.toLocaleString()} 字符）`, 'success', 2000);
  } catch (e) {
    popupTip(e instanceof Error ? e.message : '复制失败', 'error', 2500);
  }
}

/**
 * 移除列表项并释放资源
 * @param id {number} 列表项id
 */
function removeItem(id: number) {
  const idx = items.value.findIndex(i => i.id === id);
  if (idx < 0) return;
  const pv = previewCache.get(id);
  if (pv) {
    URL.revokeObjectURL(pv);
    previewCache.delete(id);
  }
  items.value.splice(idx, 1);
}

/** 清空列表 */
function clearAll() {
  items.value.forEach(i => {
    const pv = previewCache.get(i.id);
    if (pv) URL.revokeObjectURL(pv);
  });
  previewCache.clear();
  items.value = [];
  lastSummary.value = '';
}

onBeforeUnmount(clearAll);
</script>
