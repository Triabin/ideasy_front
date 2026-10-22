<!-- 编解码器输入区域组件 -->
<template>
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body p-3 gap-2">
      <div class="flex items-center justify-between mb-3">
        <h2 class="card-title text-base">
          {{ props.mode === 'encode' ? '待编码文本' : '待解码文本' }}
        </h2>
        <div class="flex flex-wrap items-center gap-2">
          <button class="btn btn-sm btn-primary" @click="codec">
            {{ props.mode === 'encode' ? '编码' : '解码' }}
          </button>
          <button class="btn btn-sm" :disabled="!props.outputText" @click="swapInOut">结果 ⇄ 输入互换</button>
          <button class="btn btn-sm btn-ghost" title="从剪贴板粘贴" @click="pasteFromClipboard">粘贴</button>
          <button class="btn btn-sm btn-ghost" title="清空" @click="clearAll">清空</button>
          <label class="label cursor-pointer gap-1 text-sm ml-auto">
            <input type="checkbox" class="toggle toggle-sm" v-model="autoRun"/>
            <span>实时转换</span>
          </label>
        </div>
      </div>
      <textarea
          v-model="inputText"
          class="textarea textarea-bordered w-full grow min-h-72 font-mono text-sm leading-relaxed resize-none thin-scrollbar"
          :class="{ 'textarea-error': !!props.errorMsg }"
          :placeholder="props.mode === 'encode' ? '在此输入需要编码的原文，支持中文等多字节字符' : '在此输入需要解码的密文'"
          spellcheck="false"
      ></textarea>
      <div v-if="props.errorMsg" class="rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2">
        <i class="text-xs text-red-500">{{ props.errorMsg }}</i>
      </div>
      <span class="text-xs opacity-60 font-mono">{{ inputStats.chars }} 字符 · {{ inputStats.lines }} 行 · {{ formatBytes(inputStats.bytes) }}</span>
    </div>
  </div>
  <!-- 输出 -->
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body p-3 gap-2">
      <div class="flex items-center justify-between mb-3">
        <h2 class="card-title text-base">
          输出
          <span v-if="props.outputText && !props.errorMsg" class="badge badge-success badge-sm">✓ {{ props.mode === 'encode' ? '编码成功' : '解码成功' }}</span>
        </h2>
        <div class="flex items-center gap-2">
          <span v-if="props.outputText" class="text-xs opacity-60 font-mono">{{ props.outputText.length }} 字符</span>
          <button
              class="btn btn-sm btn-ghost"
              title="复制结果"
              :disabled="!props.outputText"
              @click="copy(props.outputText)"
          >
            <Copied v-if="copiedText === props.outputText && copiedText" :size="16" :twClasses="['fill-success']"/>
            <Copy v-else :size="16"/>
          </button>
        </div>
      </div>
      <pre v-text="props.outputText || '转换结果将显示在这里'"
           class="w-full grow min-h-72 overflow-auto thin-scrollbar font-mono text-sm leading-relaxed
                  rounded-lg bg-base-300/50 p-3 whitespace-pre-wrap break-all"/>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, toRef, watch } from 'vue';
import { copyText, popupTip } from '@/common/utils';
import { type CodecMode } from './codec.ts';
import useSettingsStore from '@/stores/settingsStore';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';

const props = defineProps<{
  mode: CodecMode;
  outputText: string;
  errorMsg: string;
}>();
const emits = defineEmits<{
  (e: 'updateData', payload: {
    inputText: string;
    outputText: string;
    autoRun: boolean;
    errorMsg: string;
  }, codecAnyway?: boolean): void;
}>();
/** 当前模式：编码 / 解码 */
// const mode = ref<CodecMode>('encode');
/** 输入文本 */
const inputText = ref<string>('');
/** 输出文本 */
// const outputText = ref<string>('');
/** 已成功复制的文本（用于图标切换） */
const copiedText = ref<string>('');
/** 是否实时转换 */
const autoRun = ref<boolean>(true);
/** 错误信息 */
// const errorMsg = ref<string>('');
/** 操作系统类别 */
const osType = toRef(useSettingsStore(), 'osType');
/** 输入文本基础统计 */
const inputStats = computed(() => {
  const t = inputText.value;
  return {
    chars: t.length,
    lines: t ? t.split('\n').length : 0,
    bytes: new TextEncoder().encode(t).length,
  };
});

/** 字节数友好显示 */
const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

/** 输出回填输入（便于链式编解码，如先 URL 再 Base64） */
const swapInOut = () => {
  if (!props.outputText) return;
  const oldInput = inputText.value;
  inputText.value = props.outputText;
  emits('updateData', {
    inputText: inputText.value,
    outputText: oldInput,
    autoRun: autoRun.value,
    errorMsg: props.errorMsg
  });
};

/** 从剪贴板粘贴 */
const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      popupTip('剪贴板为空', 'warning', 1500);
      return;
    }
    inputText.value = text;
  } catch {
    let msg = '无法访问剪贴板，请手动粘贴';
    if (osType.value === 'Linux' || osType.value === 'Windows') {
      msg += '（Ctrl+V）';
    } else if (osType.value === 'MacOS') {
      msg += '（⌘+V）';
    }
    popupTip(msg, 'warning', 2500);
  }
};

/** 清空 */
const clearAll = () => {
  inputText.value = '';
  emits('updateData', {
    inputText: '',
    outputText: '',
    autoRun: autoRun.value,
    errorMsg: ''
  })
};

const codec = () => emits('updateData', {
  inputText: inputText.value,
  outputText: props.outputText,
  autoRun: autoRun.value,
  errorMsg: props.errorMsg
}, true);

/** 复制到剪贴板 */
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text) return;
  await copyText(text);
  copiedText.value = text;
  popupTip('已复制到剪贴板', 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
}

watch([inputText, autoRun], () => {
  emits('updateData', {
    inputText: inputText.value,
    outputText: props.outputText,
    autoRun: autoRun.value,
    errorMsg: props.errorMsg
  })
});
</script>
