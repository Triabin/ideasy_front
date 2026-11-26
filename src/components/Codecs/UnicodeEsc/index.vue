<!-- Unicode转义器页面组件 -->
<template>
  <!-- 选项配置区 -->
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body py-3 gap-2">
      <TitleModeBtn
          title="Unicode转义"
          :mode="mode"
          encode-label="转义"
          decode-label="反转义"
          @switch-mode="(newMode: CodecMode) => mode = newMode"
      />
      <!-- 功能简介说明 -->
      <i class="text-xs opacity-60">将中文、emoji 等非 ASCII 字符转为纯 ASCII 转义串，或将转义串还原为可读文本。转义支持 6 种输出格式；反转义自动识别全部格式（可混合），并正确合并 emoji 的代理对。</i>
      <div v-if="mode === 'encode'" class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-1">
        <label class="join items-center">
          <span class="join-item btn btn-sm btn-ghost pointer-events-none normal-case opacity-80">转义格式</span>
          <select class="select select-sm join-item w-105" v-model="fmt">
            <option value="u">\uXXXX（JS / JSON / Java / Python）</option>
            <option value="uBrace">\u{XXXXX}（ES6 码点转义）</option>
            <option value="x">\xXX（JS 十六进制，超出 FF 自动用 \uXXXX）</option>
            <option value="htmlHex">&amp;#xXXXX;（HTML 十六进制实体）</option>
            <option value="htmlDec">&amp;#DDDD;（HTML 十进制实体）</option>
            <option value="percentU">%uXXXX（旧式 URL 转义，非标准）</option>
          </select>
        </label>
        <label class="join items-center">
          <span class="join-item btn btn-sm btn-ghost pointer-events-none normal-case opacity-80">转义范围</span>
          <select class="select select-sm join-item w-72" v-model="scope">
            <option value="nonAscii">仅非 ASCII 字符（保留英文、数字与标点）</option>
            <option value="all">全部字符（含 ASCII）</option>
          </select>
        </label>
        <label class="label cursor-pointer gap-2 text-sm">
          <input type="checkbox" class="toggle toggle-sm toggle-primary" v-model="upperHex"/>
          <span>十六进制大写</span>
        </label>
      </div>
      <i v-else class="text-xs opacity-60">
        自动识别：\uXXXX、\u{XXXXX}、\xXX、&amp;#x…;、&amp;#…;、%uXXXX，以及 \n、\t、\\、\" 等常见转义；遇非法转义会报错并标出位置。
      </i>
    </div>
  </div>
  <!-- 输入 / 输出区 -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 grow min-h-96">
    <OutInputArea
        :mode="mode"
        :output-text="outputText"
        :error-msg="errorMsg"
        encode-label="转义"
        decode-label="反转义"
        @update-data="updateData"
    />
  </div>
</template>
<script lang="ts" setup>
import TitleModeBtn from '@/components/Codecs/TitleModeBtn.vue';
import OutInputArea from '../OutInputArea.vue';
import { ref, watch } from 'vue';
import { type CodecMode } from '../codec.ts';
import { escapeUnicode, unescapeUnicode, type EscFormat, type EscScope } from './unicode.ts';
import { popupToast } from '@/common/utils.ts';

const mode = ref<CodecMode>('encode');
const fmt = ref<EscFormat>('u');
const scope = ref<EscScope>('nonAscii');
const upperHex = ref<boolean>(false);
const inputText = ref<string>('');
const outputText = ref<string>('');
const errorMsg = ref<string>('');
const autoRun = ref<boolean>(true);

const codec = (dontTip: boolean = true) => {
  errorMsg.value = '';
  if (!inputText.value) {
    outputText.value = '';
    !dontTip && popupToast('请输入内容', { type: 'warning', duration: 1500 });
    return;
  }
  try {
    outputText.value = mode.value === 'encode'
        ? escapeUnicode(inputText.value, fmt.value, scope.value, upperHex.value)
        : unescapeUnicode(inputText.value);
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
  // 只有手动点击转义/反转义按钮时才弹窗提示
  if (codecAnyway) codec(false);
}

watch([
  mode,
  fmt,
  scope,
  upperHex,
  inputText,
  outputText,
  autoRun,
], () => {
  if (autoRun.value) codec();
});
</script>
