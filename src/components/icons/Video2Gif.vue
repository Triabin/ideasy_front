<!-- 视频转GIF图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <!-- 屏幕外框 -->
    <path d="M160 192h640a96 96 0 0 1 96 96v384a96 96 0 0 1-96 96H160a96 96 0 0 1-96-96V288a96 96 0 0 1 96-96z m0 80a16 16 0 0 0-16 16v384a16 16 0 0 0 16 16h640a16 16 0 0 0 16-16V288a16 16 0 0 0-16-16H160z"/>
    <!-- 播放三角 -->
    <path d="M408 330l232 140-232 140z"/>
    <!-- 底座 -->
    <path d="M384 768h256l-32 72H416z"/>
    <!-- 右上角转换星标 -->
    <path d="M800 200l16 38 38 16-38 16-16 38-16-38-38-16 38-16z"/>
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
