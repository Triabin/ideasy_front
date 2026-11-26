<!-- 邮箱图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" d="
      M168 224 h688 a72 72 0 0 1 72 72 v432 a72 72 0 0 1 -72 72 h-688 a72 72 0 0 1 -72 -72 v-432 a72 72 0 0 1 72 -72 Z
      M168 316 L512 566 L856 316 L856 404 L512 654 L168 404 Z
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
