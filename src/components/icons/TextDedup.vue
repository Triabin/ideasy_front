<!-- 文本去重图标：若干文本行 + 右下角删除叉号 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect x="96" y="112" width="832" height="76" rx="20"/>
    <rect x="96" y="268" width="832" height="76" rx="20"/>
    <rect x="96" y="424" width="480" height="76" rx="20"/>
    <rect x="96" y="580" width="480" height="76" rx="20"/>
    <rect x="-30" y="-130" width="60" height="260" rx="16" transform="translate(760 748) rotate(45)"/>
    <rect x="-30" y="-130" width="60" height="260" rx="16" transform="translate(760 748) rotate(-45)"/>
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
