<!-- JWT图标 -->
<template>
  <svg :class="props.twClasses" :width="props.size" :height="props.size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path>
    <path d="M512 288c-76.4 0-138 61.6-138 138v46h-32c-17.6 0-32 14.4-32 32v200c0 17.6 14.4 32 32 32h340c17.6 0 32-14.4 32-32V504c0-17.6-14.4-32-32-32h-32v-46c0-76.4-61.6-138-138-138z m70 184H442v-46c0-38.6 31.4-70 70-70s70 31.4 70 70v46z"></path>
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
