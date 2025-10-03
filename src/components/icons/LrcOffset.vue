<!-- 歌词调整图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path d="M768 581.818182H256a69.818182 69.818182 0 1 1 0-139.636364h512a69.818182 69.818182 0 1 1 0 139.636364zM535.272727 349.090909H256a69.818182 69.818182 0 0 1 0-139.636364h279.272727a69.818182 69.818182 0 0 1 0 139.636364zM256 674.909091h279.272727a69.818182 69.818182 0 1 1 0 139.636364H256a69.818182 69.818182 0 1 1 0-139.636364z"></path>
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** 自定义尺寸，单位：px */
  size?: number,
  /** tailwindcss 类名 */
  twClasses?: string[],
}>(), {
  size: 20,
  twClasses: () => ['fill-base-content']
});
</script>
