<!-- 视频转GIF工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto no-scrollbar">
    <h1 class="w-full text-center text-3xl mt-2">视频转 GIF</h1>
    <p class="text-sm opacity-70 text-center max-w-2xl mx-auto">
      把本地视频转换成 GIF 动图，可自定义帧率、尺寸、颜色数与时间片段。
      所有处理均在浏览器本地完成，视频与 GIF 都不会上传到服务器。
    </p>

    <!-- 未选择视频：拖放/点击上传 -->
    <div v-if="!file"
         class="rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 py-12 px-4
                border-base-300 hover:border-primary/60"
         @click="fileInputRef?.click()"
    >
      <Video2Gif :size="44" :twClasses="['fill-base-content', 'opacity-60']"/>
      <p class="text-sm opacity-70">将视频拖到这里（或页面任意位置），或点击选择文件</p>
      <p class="text-xs opacity-50">支持 MP4 / WebM / MOV / MKV / M4V 等浏览器可解码的格式，单个最大 1GB</p>
      <input ref="fileInputRef" type="file" accept="video/*" class="hidden" @change="onFileChange"/>
    </div>

    <template v-else>
      <!-- 原视频预览与信息 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body gap-3">
          <div class="flex flex-wrap gap-4 items-start">
            <video :src="videoUrl" muted controls loop playsinline
                   class="rounded-lg max-h-64 w-auto bg-black border border-base-300 shrink-0"/>
            <div class="flex flex-col gap-1.5 text-sm min-w-0 flex-1">
              <div class="font-medium truncate" :title="file.name">{{ file.name }}</div>
              <div class="flex flex-wrap gap-1.5">
                <span class="badge badge-sm badge-outline font-mono">{{ formatBytes(file.size) }}</span>
                <span v-if="videoMeta" class="badge badge-sm badge-outline font-mono">{{ videoMeta.width }}×{{ videoMeta.height }}</span>
                <span v-if="videoMeta" class="badge badge-sm badge-outline font-mono">时长 {{ formatTime(videoMeta.duration) }}</span>
              </div>
              <button class="btn btn-sm btn-ghost self-start mt-1" :disabled="converting" @click="resetFile">更换视频</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 转换设置 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body gap-4">
          <h2 class="card-title text-base">转换设置</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <!-- 帧率 -->
            <label class="flex flex-col gap-1">
              <span class="flex justify-between">
                <span class="opacity-70">帧率</span>
                <span class="font-mono">{{ fps }} fps</span>
              </span>
              <input type="range" min="2" max="24" step="1" class="range range-primary range-xs"
                     v-model.number="fps" :disabled="converting"/>
            </label>
            <!-- 最大宽度 -->
            <label class="flex flex-col gap-1">
              <span class="flex justify-between">
                <span class="opacity-70">最大宽度（高度按比例）</span>
                <span class="font-mono">{{ maxWidth }} px</span>
              </span>
              <input type="range" min="160" max="960" step="20" class="range range-primary range-xs"
                     v-model.number="maxWidth" :disabled="converting"/>
            </label>
            <!-- 颜色数 -->
            <label class="flex flex-col gap-1">
              <span class="flex justify-between">
                <span class="opacity-70">颜色数（越少体积越小）</span>
                <span class="font-mono">{{ maxColors }}</span>
              </span>
              <input type="range" min="32" max="256" step="8" class="range range-primary range-xs"
                     v-model.number="maxColors" :disabled="converting"/>
            </label>
            <!-- 截取片段 -->
            <div class="flex flex-col gap-1">
              <span class="opacity-70">截取片段（秒）</span>
              <div class="flex items-center gap-2">
                <label class="input input-sm w-24">
                  <span class="opacity-60 shrink-0">起</span>
                  <input type="number" min="0" step="0.1" class="font-mono" v-model.number="start" :disabled="converting"/>
                </label>
                <span class="opacity-40">→</span>
                <label class="input input-sm w-24">
                  <span class="opacity-60 shrink-0">止</span>
                  <input type="number" min="0" step="0.1" class="font-mono" v-model.number="end" :disabled="converting"/>
                </label>
                <button class="btn btn-xs btn-ghost shrink-0" :disabled="converting" @click="selectAll">全程</button>
              </div>
            </div>
          </div>

          <!-- 预估信息 -->
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <span class="badge badge-outline font-mono">约 {{ frameEstimate }} 帧</span>
            <span class="badge badge-outline font-mono">片段 {{ formatTime(clipDuration) }}</span>
            <span class="opacity-60 text-xs">帧率越高、尺寸越大、颜色越多，画质越好，但体积更大、转换更慢。</span>
          </div>

          <!-- 操作 + 进度 -->
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary btn-sm" :disabled="converting || !canConvert" @click="convert">
              {{ converting ? `转换中 ${progress.done}/${progress.total}` : '开始转换' }}
            </button>
            <button v-if="converting" class="btn btn-sm btn-error" @click="cancel">取消</button>
            <span v-if="error" class="text-error text-sm">{{ error }}</span>
          </div>
          <div v-if="converting || progress.total" class="w-full">
            <progress class="progress progress-primary w-full" :value="progress.done" :max="progress.total || 1"></progress>
            <p v-if="converting" class="text-xs opacity-60 mt-1">正在抽取并编码第 {{ progress.done }} / {{ progress.total }} 帧…</p>
          </div>
        </div>
      </div>

      <!-- 转换结果 -->
      <div v-if="result" class="card bg-base-200 shadow-sm">
        <div class="card-body gap-3">
          <div class="flex flex-wrap gap-4 items-start">
            <img :src="result.url" alt="GIF 预览"
                 class="rounded-lg border border-base-300 max-h-64 w-auto bg-base-100 shrink-0"/>
            <div class="flex flex-col gap-1.5 text-sm flex-1 min-w-0">
              <div class="font-medium truncate">{{ result.name }}</div>
              <div class="flex flex-wrap gap-1.5">
                <span class="badge badge-sm badge-success badge-outline font-mono">{{ formatBytes(result.size) }}</span>
                <span class="badge badge-sm badge-outline font-mono">{{ result.width }}×{{ result.height }}</span>
                <span class="badge badge-sm badge-outline font-mono">{{ result.frames }} 帧</span>
                <span class="badge badge-sm badge-outline font-mono">{{ formatTime(result.duration) }}</span>
                <span class="badge badge-sm font-mono" :class="result.size <= file.size ? 'badge-success' : 'badge-warning'">
                  {{ sizeDeltaText }}
                </span>
              </div>
              <div class="flex gap-2 mt-1">
                <button class="btn btn-sm btn-primary" @click="download">下载 GIF</button>
                <button class="btn btn-sm btn-ghost" :disabled="converting" @click="convert">重新生成</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import Video2Gif from '@/components/icons/Video2Gif.vue';
import { popupToast } from '@/common/utils';
import useFullScreenDropFile from '@/composables/useFullScreenDropFile.ts';
import { downloadBlob, getBaseName } from '../CompressImg/imageCompressor.ts';
import { convertVideoToGif, probeVideoFile } from './gifEncoder';

const fileInputRef = ref<HTMLInputElement>();
const file = ref<File | null>(null);
const videoUrl = ref('');
const videoMeta = ref<{ duration: number; width: number; height: number } | null>(null);

/* ------------------------- 转换参数 ------------------------- */
const fps = ref(10);
const maxWidth = ref(480);
const maxColors = ref(128);
const start = ref(0);
const end = ref(0);

/* ------------------------- 状态 ------------------------- */
const converting = ref(false);
const progress = ref({ done: 0, total: 0 });
const error = ref('');
let abortController: AbortController | null = null;

type ResultInfo = {
  blob: Blob;
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
  frames: number;
  duration: number;
};
const result = ref<ResultInfo | null>(null);

/* ------------------------- 派生 ------------------------- */
const clipDuration = computed(() => Math.max(0, end.value - start.value));
const frameEstimate = computed(() => Math.max(1, Math.floor(clipDuration.value * fps.value)));
const canConvert = computed(() => !!file.value && !!videoMeta.value && end.value > start.value);

const sizeDeltaText = computed(() => {
  if (!result.value || !file.value) return '';
  const delta = (result.value.size - file.value.size) / file.value.size * 100;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`;
});

/* ------------------------- 工具函数 ------------------------- */
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return m > 0 ? `${m}:${sec.padStart(4, '0')}` : `${sec}s`;
}

/* ------------------------- 文件 ------------------------- */
function revokeResult() {
  if (result.value) {
    URL.revokeObjectURL(result.value.url);
    result.value = null;
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (f) setFile(f);
}

async function setFile(f: File) {
  error.value = '';
  revokeResult();
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
  file.value = f;
  videoUrl.value = URL.createObjectURL(f);
  videoMeta.value = null;
  progress.value = { done: 0, total: 0 };
  try {
    const meta = await probeVideoFile(f);
    videoMeta.value = meta;
    start.value = 0;
    end.value = Math.round(meta.duration * 10) / 10;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '无法读取视频信息';
    error.value = msg;
    popupToast(msg, { type: 'error', duration: 3000 });
  }
}

function selectAll() {
  if (!videoMeta.value) return;
  start.value = 0;
  end.value = Math.round(videoMeta.value.duration * 10) / 10;
}

function resetFile() {
  abortController?.abort();
  revokeResult();
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
  videoUrl.value = '';
  file.value = null;
  videoMeta.value = null;
  error.value = '';
  progress.value = { done: 0, total: 0 };
}

/* ------------------------- 转换 ------------------------- */
async function convert() {
  if (!file.value || !videoMeta.value || !canConvert.value) return;
  error.value = '';
  converting.value = true;
  progress.value = { done: 0, total: frameEstimate.value };
  abortController = new AbortController();
  try {
    const res = await convertVideoToGif(file.value, {
      fps: fps.value,
      maxWidth: maxWidth.value,
      maxColors: maxColors.value,
      start: start.value,
      end: end.value,
      signal: abortController.signal,
      onProgress: (done, total) => {
        progress.value = { done, total };
      },
    });
    revokeResult();
    result.value = {
      blob: res.blob,
      url: URL.createObjectURL(res.blob),
      name: `${getBaseName(file.value.name)}.gif`,
      size: res.blob.size,
      width: res.width,
      height: res.height,
      frames: res.frameCount,
      duration: res.duration,
    };
    popupToast('转换完成', { type: 'success', duration: 1500 });
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      popupToast('已取消转换', { type: 'info', duration: 1500 });
    } else {
      const msg = e instanceof Error ? e.message : '转换失败';
      error.value = msg;
      popupToast(msg, { type: 'error', duration: 3000 });
    }
  } finally {
    converting.value = false;
    abortController = null;
  }
}

function cancel() {
  abortController?.abort();
}

function download() {
  if (result.value) downloadBlob(result.value.blob, result.value.name);
}

onBeforeUnmount(() => {
  abortController?.abort();
  revokeResult();
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
});

useFullScreenDropFile(fileInputRef, {
  accept: (f: File) => f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|ogv|3gp|m2ts)$/i.test(f.name),
  maxSize: 1024 * 1024 * 1024,
  overlayText: '松开鼠标，添加要转 GIF 的视频',
  onReject: (rejected, reason) => {
    if (reason === 'size') {
      popupToast(`已忽略超过 1GB 的文件：${rejected.map(f => f.name).join('、')}`, { type: 'warning', duration: 2500 });
    } else {
      popupToast(`已忽略 ${rejected.length} 个非视频文件`, { type: 'warning', duration: 2000 });
    }
  },
});
</script>
