<!-- 正则测试图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <!-- 放大镜外圈 -->
    <path d="M432 128a304 304 0 1 1 0 608 304 304 0 0 1 0-608z m0 84a220 220 0 1 0 0 440 220 220 0 0 0 0-440z"/>
    <!-- 手柄 -->
    <path d="M664 620l196 196-58 58-196-196z"/>
    <!-- 镜片内的 .* -->
    <text x="432" y="520" text-anchor="middle" font-family="ui-monospace, Menlo, monospace"
          font-size="210" font-weight="700">.*</text>
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
