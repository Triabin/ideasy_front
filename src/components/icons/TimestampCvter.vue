<!-- 时间戳图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path d="M903.04 672H568.96a56.96 56.96 0 0 0-56.96 56.96v174.08a56.96 56.96 0 0 0 56.96 56.96h334.08a56.96 56.96 0 0 0 56.96-56.96v-174.08a56.96 56.96 0 0 0-56.96-56.96zM608 896H576v-160h32z m128-32H704V832h32z m0-64H704V768h32z m160 48a48 48 0 0 1-96 0v-64a48 48 0 0 1 96 0zM848 768a16 16 0 0 0-16 16v64a16 16 0 0 0 32 0v-64a16 16 0 0 0-16-16z" fill="#FF8910"></path>
    <path d="M544 224h-64v320h192v-64h-128z m-32-128a415.36 415.36 0 0 0-64 826.24v-64A352 352 0 1 1 864 512a366.08 366.08 0 0 1-13.44 96h64A428.16 428.16 0 0 0 928 512 416.64 416.64 0 0 0 512 96z"></path>
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
