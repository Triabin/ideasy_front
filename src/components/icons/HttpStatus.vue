<!-- HTTP 状态码图标：请求（向右）与响应（向左）双向箭头 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <!-- 请求：上方箭头指向右 -->
    <rect x="144" y="232" width="512" height="96" rx="48"/>
    <path d="M656 152 L888 280 L656 408 Z"/>
    <!-- 响应：下方箭头指向左 -->
    <rect x="368" y="696" width="512" height="96" rx="48"/>
    <path d="M368 616 L136 744 L368 872 Z"/>
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
