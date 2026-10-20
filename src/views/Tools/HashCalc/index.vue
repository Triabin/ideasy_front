<!-- 哈希计算页面路由组件 -->
<template>
  <div class="h-full max-h-full w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">哈希计算</h1>
    <p class="text-sm opacity-70 text-center">支持 MD5 / SHA1 / SHA256 三种算法，可对字符串和文件进行哈希值计算，所有计算均在本地浏览器完成。</p>

    <!-- 模式切换 & 格式选项 -->
    <div class="flex flex-wrap items-center justify-center gap-4">
      <div class="join">
        <button class="btn join-btn btn-sm" :class="mode === 'string' ? 'btn-primary' : ''" @click="mode = 'string'">字符串</button>
        <button class="btn join-btn btn-sm" :class="mode === 'file' ? 'btn-primary' : ''" @click="mode = 'file'">文件</button>
      </div>
      <label class="label cursor-pointer gap-2">
        <span class="label-text text-sm">大写</span>
        <input type="checkbox" class="toggle toggle-sm" v-model="upperCase"/>
      </label>
      <label class="label cursor-pointer gap-2">
        <span class="label-text text-sm">每 8 位分组</span>
        <input type="checkbox" class="toggle toggle-sm" v-model="grouped"/>
      </label>
    </div>

    <!-- 字符串输入区 -->
    <div v-if="mode === 'string'" class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <textarea
            class="textarea textarea-bordered w-full font-mono min-h-32"
            v-model="inputText"
            placeholder="请输入要计算哈希的字符串（UTF-8 编码）……"
            spellcheck="false"
        ></textarea>
        <div class="flex flex-wrap items-center gap-3 text-sm">
          <span class="badge badge-outline font-mono">{{ byteLength }} 字节</span>
          <span class="badge badge-outline font-mono">{{ inputText.length }} 字符</span>
          <button class="btn btn-sm btn-ghost ml-auto" @click="clearInput" :disabled="!inputText">清空</button>
        </div>
      </div>
    </div>

    <!-- 文件输入区 -->
    <div v-else class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div
            class="rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer select-none"
            :class="dragOver ? 'border-primary bg-primary/5' : 'border-base-300'"
            @click="fileInput?.click()"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
        >
          <Hash :size="40" :twClasses="['fill-base-content', 'opacity-40', 'mx-auto', 'mb-2']"/>
          <p class="text-sm opacity-70">点击选择文件，或将文件拖拽到此处</p>
          <input ref="fileInput" type="file" class="hidden" @change="onFileChange"/>
        </div>
        <div v-if="currentFile" class="flex flex-wrap items-center gap-3 text-sm">
          <span class="font-mono break-all">{{ currentFile.name }}</span>
          <span class="badge badge-outline font-mono">{{ formatFileSize(currentFile.size) }}</span>
          <progress v-if="calculating" class="progress progress-primary w-40" :value="progress * 100" max="100"></progress>
          <button class="btn btn-sm btn-ghost ml-auto" @click="clearFile" :disabled="calculating">移除</button>
        </div>
      </div>
    </div>

    <!-- 各算法结果（点击复制） -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div
          v-for="item in results"
          :key="item.algorithm"
          class="card bg-base-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          :class="{ 'ring-1 ring-primary': activeAlgorithm === item.algorithm }"
          title="点击复制"
          @click="copy(item.display)"
      >
        <div class="card-body py-3 px-4 gap-1">
          <div class="flex items-center justify-between">
            <i class="text-xs opacity-60">{{ item.label }}{{ !item.raw && calculating ? '（计算中…）' : '' }}</i>
            <div class="flex items-center opacity-60">
              <Copied v-if="copiedText === item.display" :size="18" :twClasses="['fill-success']"/>
              <Copy v-else :size="18"/>
            </div>
          </div>
          <span class="font-mono break-all text-sm select-all">
            {{ item.display || (error ? '计算失败' : '—') }}
          </span>
        </div>
      </div>
    </div>

    <!-- 校验对比：粘贴已知摘要判断是否一致 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">摘要校验</h2>
        <p class="text-xs opacity-60">粘贴已知的哈希值（可带前缀如 <span class="font-mono">sha256:</span>），自动识别算法并与上方结果比对。</p>
        <input
            type="text"
            class="input input-bordered w-full font-mono"
            v-model="verifyText"
            placeholder="如：5e9d...d61c 或 sha1:d9f2...cabc"
            spellcheck="false"
        />
        <div v-if="verifyResult" class="alert py-2 text-sm" :class="verifyResult.match ? 'alert-success' : 'alert-warning'">
          <span>
            {{ verifyResult.match ? `匹配成功：与 ${verifyResult.algorithm} 计算结果一致` : `不匹配${verifyResult.algorithm ? '（识别为 ' + verifyResult.algorithm + '）' : ''}` }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import Hash from '@/components/icons/Hash.vue';
import {
  ALGORITHMS,
  hashString,
  hashFile,
  normalizeAlgorithm,
  formatFileSize,
  type HashAlgorithm,
} from './hashCalculator';
import { copyText, popupTip } from '@/common/utils.ts';

/* ------------------------- 状态 ------------------------- */

type Mode = 'string' | 'file';
const mode = ref<Mode>('string');
const inputText = ref<string>('Hello, World!');
const upperCase = ref<boolean>(true);
const grouped = ref<boolean>(false);
const copiedText = ref<string>('');
const error = ref<string>('');

/** 每个算法的计算结果（小写十六进制原文） */
const digests = reactive<Record<string, string>>({});
/** 最近一次参与计算的输入标识，用于防止异步竞态 */
let computeToken = 0;

const calculating = ref(false);

/* ------------------------- 结果展示 ------------------------- */

const formatDigest = (raw: string): string => {
  if (!raw) return '';
  let hex = upperCase.value ? raw.toUpperCase() : raw;
  if (grouped.value) {
    const groups: string[] = [];
    for (let i = 0; i < hex.length; i += 8) groups.push(hex.slice(i, i + 8));
    hex = groups.join(' ');
  }
  return hex;
};

const results = computed(() =>
    ALGORITHMS.map(a => ({
      algorithm: a.value,
      label: a.label,
      raw: digests[a.value] ?? '',
      display: formatDigest(digests[a.value] ?? ''),
    }))
);

/** 当前激活算法（由校验前缀/长度识别，仅用于高亮提示） */
const activeAlgorithm = ref<string>('');

/* ------------------------- 计算逻辑 ------------------------- */

async function computeAll(source: 'string' | 'file'): Promise<void> {
  const token = ++computeToken;
  error.value = '';
  // 先清空旧结果
  for (const a of ALGORITHMS) delete digests[a.value];
  const file = source === 'file' ? currentFile.value : null;
  if (source === 'string' && !inputText.value) return;
  if (source === 'file' && !file) return;
  calculating.value = true;
  progress.value = 0;
  try {
    for (const a of ALGORITHMS) {
      const digest = source === 'string'
          ? await hashString(inputText.value, a.value)
          : await hashFile(file!, a.value, r => {
            if (token === computeToken) progress.value = r;
          });
      if (token !== computeToken) return; // 已有更新的计算任务，丢弃过期结果
      digests[a.value] = digest;
    }
    if (token === computeToken) progress.value = 1;
  } catch (e: any) {
    if (token === computeToken) error.value = e?.message ?? '计算失败';
  } finally {
    if (token === computeToken) calculating.value = false;
  }
}

/* ------------------------- 字符串模式：实时计算 ------------------------- */

const byteLength = computed(() => new TextEncoder().encode(inputText.value).length);

// 字符串输入变化时防抖重新计算
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch([inputText, mode], () => {
  for (const a of ALGORITHMS) delete digests[a.value];
  if (mode.value === 'string') {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => computeAll('string'), 200);
  }
}, { immediate: true });

/* ------------------------- 文件模式 ------------------------- */

const fileInput = ref<HTMLInputElement>();
const currentFile = ref<File | null>(null);
const dragOver = ref(false);
const progress = ref(0);

const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) setFile(file);
  // 允许重复选择同一文件
  (e.target as HTMLInputElement).value = '';
};

const onDrop = (e: DragEvent) => {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) setFile(file);
};

function setFile(file: File) {
  currentFile.value = file;
  computeAll('file');
}

const clearFile = () => {
  currentFile.value = null;
  progress.value = 0;
  computeToken++;
  calculating.value = false;
  for (const a of ALGORITHMS) delete digests[a.value];
  error.value = '';
};

const clearInput = () => {
  inputText.value = '';
};

// 切换到文件模式且已选文件时补算；切回字符串时重算
watch(mode, (m) => {
  if (m === 'file') {
    if (currentFile.value) computeAll('file');
  } else {
    computeAll('string');
  }
});

/* ------------------------- 摘要校验 ------------------------- */

interface VerifyResult {
  match: boolean;
  algorithm: HashAlgorithm | null;
}

const verifyText = ref<string>('');

const verifyResult = computed<VerifyResult | null>(() => {
  const raw = verifyText.value.trim();
  if (!raw) {
    activeAlgorithm.value = '';
    return null;
  }
  // 识别 "算法名:摘要" 前缀
  let algorithm: HashAlgorithm | null = null;
  let hex = raw;
  const m = raw.match(/^([a-z0-9_-]+)[:\s=]+([0-9a-fA-F\s:_-]+)$/i);
  if (m) {
    algorithm = normalizeAlgorithm(m[1]);
    if (algorithm) hex = m[2];
  }
  const clean = hex.replace(/[\s:_-]/g, '').toLowerCase();
  if (!/^[0-9a-f]+$/.test(clean)) {
    activeAlgorithm.value = '';
    return { match: false, algorithm };
  }
  // 未识别前缀时按摘要长度猜测算法
  if (!algorithm) {
    const byLen = ALGORITHMS.find(a => a.bits === clean.length * 4);
    algorithm = byLen?.value ?? null;
  }
  activeAlgorithm.value = algorithm ?? '';
  if (!algorithm) return { match: false, algorithm: null };
  const target = digests[algorithm];
  if (!target) return { match: false, algorithm };
  return { match: target === clean, algorithm };
});

/* ------------------------- 交互 ------------------------- */

const truncate = (s: string) => (s.length > 16 ? s.slice(0, 8) + '…' + s.slice(-6) : s);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text) return;
  await copyText(text);
  copiedText.value = text;
  popupTip(`已复制 ${truncate(text)}`, 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
};

// 计算出错时提示
watch(error, (err) => {
  if (err) popupTip(err, 'error', 2500);
});
</script>
