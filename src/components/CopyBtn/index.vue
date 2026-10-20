<template>
  <button
      class="btn btn-sm btn-ghost gap-1 shrink-0"
      :title="props.title"
      @click="copy(props.value)"
  >
    <Copied v-if="copiedText === props.value" :size="16" :twClasses="['fill-success']"/>
    <Copy v-else :size="16"/>
    复制
  </button>
</template>

<script setup lang="ts">
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { copyText, popupTip } from '@/common/utils';
import { ref, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{
  /** 按钮名称 */
  label: string;
  /** 待复制内容 */
  value: string;
  /** 鼠标悬浮在按钮上的提示内容 */
  title: string;
  /** 提示过渡时长（单位：ms） */
  duration: number;
  /** 是否开启弹窗提示 */
  popupTip: 'on' | 'off';
}>(), {
  label: '复制',
  title: '点击复制结果',
  duration: 1500,
  popupTip: 'off',
});
const copiedText = ref<string | null>(null);

const truncate = (s: string) => (s.length > 20 ? s.slice(0, 8) + '…' + s.slice(-6) : s);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text) return;
  try {
    await copyText(text);
    copiedText.value = text;
    props.popupTip && popupTip(`已复制 ${truncate(text)}`, 'success', props.duration);
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copiedText.value = ''), props.duration);
  } catch (e: any) {
    props.popupTip && popupTip(e.message ?? '复制失败', 'error', 2500);
  }
}
onBeforeUnmount(() => copyTimer && clearTimeout(copyTimer));
</script>
