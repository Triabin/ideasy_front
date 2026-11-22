<!-- Star图标 -->
<template>
  <svg xmlns="http://www.w3.org/2000/svg"
       viewBox="0 0 24 24"
       class="size-[1.2em]"
       :fill="props.filled ? 'currentColor' : 'none'"
       stroke="currentColor"
       stroke-width="1.8"
       stroke-linecap="round"
       stroke-linejoin="round"
  >
    <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.57l-5.9 3.1 1.13-6.58L2.45 9.44l6.6-.96L12 2.5z"/>
  </svg>
</template>
<script lang="ts" setup>
const props = withDefaults(defineProps<{ filled?: boolean }>(), { filled: false });
</script>
