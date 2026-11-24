<!-- 十二时辰（日晷）图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path d="M512 96C282.6 96 96 282.6 96 512s186.6 416 416 416 416-186.6 416-416S741.4 96 512 96z m0 64c194.4 0 352 157.6 352 352S706.4 864 512 864 160 706.4 160 512 317.6 160 512 160z" fill="#FF8910"></path>
    <path d="M512 264l48 200 200 48-200 48-48 200-48-200-200-48 200-48z"></path>
    <path d="M512 464a48 48 0 1 0 0 96 48 48 0 0 0 0-96z" fill="#FF8910"></path>
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
