<template>
  <div class="w-full pl-1 pr-1">
    <form @submit.prevent="search">
      <label class="input w-full">
        <Search/>
        <input ref="searchInput"
               type="search"
               class="grow"
               placeholder="你找啥？"
               v-model="keyword"
        />
        <kbd v-if="osType === 'MacOS'" class="kbd kbd-md">⌘</kbd>
        <kbd v-if="osType === 'Windows' || osType === 'Linux'" class="kbd kbd-md">Ctrl</kbd>
        <kbd v-if="osType === 'Windows' || osType === 'Linux' || osType === 'MacOS'" class="kbd kbd-md">K</kbd>
      </label>
    </form>
  </div>
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
      || (osType.value === 'MacOS' && e.metaKey && e.key === 'k') // MacOS
  ) {
    e.preventDefault();
    searchInput.value?.focus();
  }
  if (searchInput.value == document.activeElement && e.key === 'Escape') {
    e.preventDefault();
    // 取消聚焦
    searchInput.value?.blur();
  }
};

const search = () => {
  // 取消聚焦
  searchInput.value?.blur();
  // 调用父组件的搜索事件
  emits('search', keyword.value);
}

onMounted(() => document.addEventListener('keydown', keyDownListener));
onUnmounted(() => document.removeEventListener('keydown', keyDownListener))
</script>
