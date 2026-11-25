<!-- 计算器图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <!-- 机身外框 -->
    <path fill-rule="evenodd" d="M192 64h640a128 128 0 0 1 128 128v640a128 128 0 0 1-128 128H192A128 128 0 0 1 64 832V192A128 128 0 0 1 192 64zm0 96a32 32 0 0 0-32 32v640a32 32 0 0 0 32 32h640a32 32 0 0 0 32-32V192a32 32 0 0 0-32-32H192z"/>
    <!-- 显示屏 -->
    <rect x="192" y="192" width="640" height="144" rx="24"/>
    <!-- 按键（4列 × 3行） -->
    <rect x="216" y="392" width="112" height="96" rx="20"/>
    <rect x="376" y="392" width="112" height="96" rx="20"/>
    <rect x="536" y="392" width="112" height="96" rx="20"/>
    <rect x="696" y="392" width="112" height="96" rx="20"/>
    <rect x="216" y="552" width="112" height="96" rx="20"/>
    <rect x="376" y="552" width="112" height="96" rx="20"/>
    <rect x="536" y="552" width="112" height="96" rx="20"/>
    <rect x="696" y="552" width="112" height="96" rx="20"/>
    <rect x="216" y="712" width="112" height="96" rx="20"/>
    <rect x="376" y="712" width="112" height="96" rx="20"/>
    <rect x="536" y="712" width="112" height="96" rx="20"/>
    <rect x="696" y="712" width="112" height="96" rx="20"/>
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
