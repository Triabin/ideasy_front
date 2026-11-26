<!-- 图片取色盘图标：画家调色盘（圆盘 + 拇指孔 + 颜料孔） -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" d="
      M96 512 a416 416 0 1 0 832 0 a416 416 0 1 0 -832 0 Z
      M608 672 a96 96 0 1 0 192 0 a96 96 0 1 0 -192 0 Z
      M308 328 a68 68 0 1 0 136 0 a68 68 0 1 0 -136 0 Z
      M560 296 a56 56 0 1 0 112 0 a56 56 0 1 0 -112 0 Z
      M252 560 a60 60 0 1 0 120 0 a60 60 0 1 0 -120 0 Z
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
