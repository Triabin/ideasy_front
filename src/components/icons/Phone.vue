<!-- 手机图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" d="
      M376 64 h272 a88 88 0 0 1 88 88 v720 a88 88 0 0 1 -88 88 h-272 a88 88 0 0 1 -88 -88 v-720 a88 88 0 0 1 88 -88 Z
      M368 176 h288 a24 24 0 0 1 24 24 v552 a24 24 0 0 1 -24 24 h-288 a24 24 0 0 1 -24 -24 v-552 a24 24 0 0 1 24 -24 Z
      M468 112 h88 a12 12 0 0 1 0 24 h-88 a12 12 0 0 1 0 -24 Z
      M464 856 a48 48 0 1 0 96 0 a48 48 0 1 0 -96 0 Z
    "/>
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
