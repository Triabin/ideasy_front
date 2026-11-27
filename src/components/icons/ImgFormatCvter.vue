<!-- 图片格式转换图标：两张叠放的图片框（前景带山与太阳） -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <!-- 后层图片框（右上） -->
    <path fill-rule="evenodd" d="
      M384 96 h480 a64 64 0 0 1 64 64 v480 a64 64 0 0 1 -64 64 h-480 a64 64 0 0 1 -64 -64 v-480 a64 64 0 0 1 64 -64 Z
      M408 160 h432 a24 24 0 0 1 24 24 v432 a24 24 0 0 1 -24 24 h-432 a24 24 0 0 1 -24 -24 v-432 a24 24 0 0 1 24 -24 Z
    "/>
    <!-- 前层图片框（左下），框内挖出太阳与山 -->
    <path fill-rule="evenodd" d="
      M160 320 h480 a64 64 0 0 1 64 64 v480 a64 64 0 0 1 -64 64 h-480 a64 64 0 0 1 -64 -64 v-480 a64 64 0 0 1 64 -64 Z
      M176 376 h448 a24 24 0 0 1 24 24 v448 a24 24 0 0 1 -24 24 h-448 a24 24 0 0 1 -24 -24 v-448 a24 24 0 0 1 24 -24 Z
      M224 504 a56 56 0 1 0 112 0 a56 56 0 1 0 -112 0 Z
      M184 808 L368 568 L480 712 L560 616 L632 808 Z
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
