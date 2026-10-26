<!-- 主题模式自动图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path d="M864 512A352 352 0 1 0 512 864V960A448 448 0 1 1 512 64a448 448 0 0 1 0 896v-96A352 352 0 0 0 864 512z"></path>
    <path d="M512 224a288 288 0 0 0 0 576v-576z"></path>
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
