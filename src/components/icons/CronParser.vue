<!-- Cron 解析图标：循环箭头（周期调度）+ 时钟指针 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <!-- 外环（右上方留缺口） -->
    <path d="M640.6 116.4 A416 416 0 1 0 907.6 383.5 L823.9 410.6 A328 328 0 1 1 613.4 200.1 Z"/>
    <!-- 箭头（沿顺时针方向） -->
    <path d="M887.5 463.7 L909.3 330.3 L791.3 368.7 Z"/>
    <!-- 时针（指向 10 点） -->
    <rect x="490" y="342" width="44" height="192" rx="22" transform="rotate(-60 512 512)"/>
    <!-- 分针（指向 2 点） -->
    <rect x="490" y="282" width="44" height="252" rx="22" transform="rotate(60 512 512)"/>
    <!-- 指针轴心 -->
    <circle cx="512" cy="512" r="44"/>
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
