<!-- 八字（太极）图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path d="M512 96a416 416 0 0 0 0 832 208 208 0 0 1 0-416 208 208 0 0 0 0-416z"></path>
    <path d="M512 252a52 52 0 1 0 0 104 52 52 0 0 0 0-104z" fill="#FF8910"></path>
    <path d="M512 668a52 52 0 1 0 0 104 52 52 0 0 0 0-104z"></path>
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
