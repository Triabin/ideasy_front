<template>
  <form @submit.passive="() => emits('search', keyword)">
    <label class="input w-full">
      <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g
            stroke-linejoin="round"
            stroke-linecap="round"
            stroke-width="2.5"
            fill="none"
            stroke="currentColor"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </g>
      </svg>
      <input ref="searchInput" type="search" class="grow" placeholder="你找啥？" v-model="keyword"/>
      <kbd v-if="osType === 'MacOS'" class="kbd kbd-sm">⌘</kbd>
      <kbd v-if="osType === 'Windows' || osType === 'Linux'" class="kbd kbd-sm">Ctrl</kbd>
      <kbd v-if="osType === 'Windows' || osType === 'Linux' || osType === 'MacOS'" class="kbd kbd-sm">K</kbd>
    </label>
  </form>
</template>
<script setup lang="ts">
import { ref, toRef, useTemplateRef, onMounted, onUnmounted } from 'vue';
import useSettingsStore from '@/stores/settingsStore';

const osType = toRef(useSettingsStore(), 'osType');
const emits = defineEmits(['search']);
const keyword = ref('');
const searchInput = useTemplateRef<HTMLInputElement>('searchInput');

const keyDownListener: (event: KeyboardEvent) => void = (e: KeyboardEvent) => {
  if (((osType.value === 'Windows' || osType.value === 'Linux') && e.ctrlKey && e.key === 'k') // Windows/Linux
      || (osType.value === 'MacOS' && e.metaKey && e.key === 'k')
  ) { // MacOS
    e.preventDefault();
    searchInput.value?.focus();
  }
  if (searchInput.value == document.activeElement && e.key === 'Escape') {
    e.preventDefault();
    // 取消聚焦
    searchInput.value?.blur();
  }
};

onMounted(() => document.addEventListener('keydown', keyDownListener));
onUnmounted(() => document.removeEventListener('keydown', keyDownListener))
</script>
