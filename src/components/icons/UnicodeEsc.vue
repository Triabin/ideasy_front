<!-- Unicode转义图标：Unicode 标志「U+」字形 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <!-- 字母 U -->
    <path d="M120 232 v336 a208 208 0 0 0 416 0 v-336 h-96 v336 a112 112 0 0 1 -224 0 v-336 Z"/>
    <!-- 加号（横） -->
    <rect x="640" y="386" width="256" height="88" rx="44"/>
    <!-- 加号（竖） -->
    <rect x="724" y="302" width="88" height="256" rx="44"/>
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
