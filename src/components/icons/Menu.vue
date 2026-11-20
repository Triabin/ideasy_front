<!-- 菜单（汉堡）图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
       xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6h16"></path>
    <path d="M4 12h16"></path>
    <path d="M4 18h16"></path>
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
  twClasses: () => []
});
</script>
