<!-- 简繁转换图标：简 → 繁 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <text x="228" y="650" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif"
          font-size="330" font-weight="700">简</text>
    <text x="796" y="650" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif"
          font-size="330" font-weight="700">繁</text>
    <!-- 中间的转换箭头 -->
    <path d="M412 512h120v-46l112 58-112 58v-46H412z"/>
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
