<!-- URL编解码器页面组件 -->
<template>
  <!-- 选项配置区（根据当前工具的 options 动态渲染） -->
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body py-3 gap-2">
      <TitleModeBtn title="URL编解码" :mode="mode" @switch-mode="(newMode: CodecMode) => mode = newMode"/>
      <!-- 功能简介说明 -->
      <i class="text-xs opacity-60">百分号（%XX）转义的 URL 编解码，支持整串编码与组件级编码，解码时严格校验转义与 UTF-8 合法性。</i>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-1">
        <label class="join items-center">
          <span class="join-item btn btn-sm btn-ghost pointer-events-none normal-case opacity-80">编码范围</span>
          <select class="select select-sm join-item w-60" v-model="codecScope">
            <option value="full">整个字符串【encodeURI，保留URL结构字符】</option>
            <option value="component">URL组件【encodeURIComponent，仅保留字母数字与-_.!~*'()】</option>
          </select>
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
import { type CodecMode } from '../codec.ts';
import { popupTip } from '@/common/utils.ts';

const mode = ref<CodecMode>('decode');
const codecScope = ref<string>('full');
const inputText = ref<string>('');
const outputText = ref<string>('');
const errorMsg = ref<string>('');
const autoRun = ref<boolean>(true);

const codec = (dontTip: boolean = true) => {
  errorMsg.value = '';
  if (!inputText.value) {
    outputText.value = '';
    !dontTip && popupTip('请输入内容', 'warning', 1500);
    return;
  }
  try {
    if (mode.value === 'encode') {
      outputText.value = codecScope.value === 'full' ? encodeURI(inputText.value) : encodeURIComponent(inputText.value);
    } else if (mode.value === 'decode') {
      outputText.value = codecScope.value === 'full' ? decodeURI(inputText.value) : decodeURIComponent(inputText.value);
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
  codecScope,
  inputText,
  outputText,
  autoRun,
], () => {
  if (autoRun.value) codec();
});
</script>
