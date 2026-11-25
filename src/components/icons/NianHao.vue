<!-- 年号（印章）图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <!-- 印章外框 -->
    <path fill-rule="evenodd" d="M160 64h704a96 96 0 0 1 96 96v704a96 96 0 0 1-96 96H160a96 96 0 0 1-96-96V160a96 96 0 0 1 96-96zm32 160a32 32 0 0 0-32 32v512a32 32 0 0 0 32 32h512a32 32 0 0 0 32-32V256a32 32 0 0 0-32-32H224z"/>
    <!-- 印文「年」 -->
    <text x="512" y="668" text-anchor="middle" font-size="430" font-family="serif" font-weight="bold">年</text>
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
