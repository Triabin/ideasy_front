<!-- Base64编解码器页面组件 -->
<template>
  <!-- 选项配置区（根据当前工具的 options 动态渲染） -->
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body py-3 gap-2">
      <TitleModeBtn title="Base64" :mode="mode" @switch-mode="(newMode: CodecMode) => mode = newMode"/>
      <!-- 功能简介说明 -->
      <i class="text-xs opacity-60">基于RFC4648的Base64编码，支持标准与URL安全字母表，可配置padding。
        <a
          href="https://spirit.triabin.cn/coding/common/什么是base64"
          target="_blank"
          class="link link-primary"
        >什么是base64？</a></i>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-1">
        <label class="join items-center">
          <span class="join-item btn btn-sm btn-ghost pointer-events-none normal-case opacity-80">变体</span>
          <select class="select select-sm join-item w-60" v-model="variant">
            <option value="std">标准（A-Za-z0-9+/）</option>
            <option value="url">URL安全（-_代替+/）</option>
          </select>
        </label>
        <label v-if="false" class="label cursor-pointer gap-2 text-sm">
          <input type="checkbox" class="toggle toggle-sm" v-model="keepPadding"/>
          <span>保留padding（=）</span>
        </label>
        <label class="label cursor-pointer gap-2 text-sm">
          <input type="checkbox" class="toggle toggle-sm" v-model="useUtf8"/>
          <span>按UTF-8处理中文等多字节字符</span>
        </label>
      </div>
    </div>
  </div>
  <!-- 输入 / 输出区 -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 grow min-h-96">
    <OutInputArea
        :mode="mode"
        :output-text="outputText"
        :error-msg="errorMsg"
        @update-data="updateData"
    />
  </div>
</template>
<script lang="ts" setup>
import TitleModeBtn from '@/components/Codecs/TitleModeBtn.vue';
import OutInputArea from '../OutInputArea.vue';
import { ref, watch } from 'vue';
import { type CodecMode, utf8ToBytes } from '../codec.ts';
import {
  latin1Bytes,
  fromLatin1,
  bytesToBase64Standard,
  base64ToBytes,
  bytesToUtf8
} from './base64.ts';
import { popupTip } from '@/common/utils.ts';

const mode = ref<CodecMode>('encode');
const inputText = ref<string>('');
const outputText = ref<string>('');
const errorMsg = ref<string>('');
const variant = ref<string>('std');
const autoRun = ref<boolean>(true);
const keepPadding = ref<boolean>(true);
const useUtf8 = ref<boolean>(true);

const codec = (dontTip: boolean = true) => {
  errorMsg.value = '';
  if (!inputText.value) {
    outputText.value = '';
    !dontTip && popupTip('请输入内容', 'warning', 1500);
    return;
  }
  try {
    if (mode.value === 'encode') {
      const bytes = useUtf8.value ? utf8ToBytes(inputText.value) : latin1Bytes(inputText.value);
      const stdBase64 = bytesToBase64Standard(bytes);
      const out = variant.value === 'url' ? stdBase64
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          : stdBase64;
      outputText.value = keepPadding.value ? out : out.replace(/=+$/, '');
    } else if (mode.value === 'decode') {
      const bytes = base64ToBytes(inputText.value);
      outputText.value = useUtf8.value ? bytesToUtf8(bytes) : fromLatin1(bytes);
    }
  } catch (e: any) {
    outputText.value = '';
    errorMsg.value = e?.message ?? '转换失败';
  }
}

const updateData = (payload: {
  inputText: string;
  outputText: string;
  autoRun: boolean;
  errorMsg: string;
}, codecAnyway?: boolean) => {
  autoRun.value = payload.autoRun;
  inputText.value = payload.inputText;
  outputText.value = payload.outputText;
  errorMsg.value = payload.errorMsg;
  // 只有手动点击编/解码按钮时才弹窗提示
  if (codecAnyway) codec(false);
}

watch([
  mode,
  inputText,
  outputText,
  variant,
  autoRun,
  keepPadding,
  useUtf8
], () => {
  if (autoRun.value) codec();
});
</script>
