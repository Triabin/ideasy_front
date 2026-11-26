<!-- 联系人图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <!-- 头部 -->
    <circle cx="472" cy="304" r="144"/>
    <!-- 肩部 -->
    <path d="M472 512 c-192 0 -328 120 -352 320 h704 c-24 -200 -160 -320 -352 -320 Z"/>
    <!-- 星芒（随机） -->
    <path d="M848 112 L876 204 L968 232 L876 260 L848 352 L820 260 L728 232 L820 204 Z"/>
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
