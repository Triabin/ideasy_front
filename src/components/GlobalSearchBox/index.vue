<template>
  <div class="w-full pl-1 pr-1">
    <form @submit.prevent="search">
      <label class="input w-full">
        <Search class="cursor-pointer"/>
        <input ref="searchInput"
               type="search"
               class="grow"
               placeholder="你找啥？"
               :value="modelValue"
               @input="onInput"
               @focus="() => focused = true"
               @blur="() => focused = false"
        />
        <span v-if="!focused">
          <kbd v-if="osType === 'MacOS'" class="kbd kbd-md">⌘</kbd>
          <kbd v-else class="kbd kbd-md">Ctrl</kbd>
          <kbd class="kbd kbd-md">K</kbd>
        </span>
      </label>
    </form>
  </div>
</template>
<script setup lang="ts">
import { ref, toRef, useTemplateRef, onMounted, onUnmounted } from 'vue';
import useSettingsStore from '@/stores/settingsStore';

const osType = toRef(useSettingsStore(), 'osType');
// 支持 v-model 双向绑定搜索关键字
const props = defineProps<{ modelValue?: string }>();
const emits = defineEmits(['search', 'update:modelValue']);
const searchInput = useTemplateRef<HTMLInputElement>('searchInput');
const focused = ref(false);

const onInput = (e: Event) => {
  emits('update:modelValue', (e.target as HTMLInputElement).value);
};

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
  emits('search', props.modelValue ?? '');
}

onMounted(() => document.addEventListener('keydown', keyDownListener));
onUnmounted(() => document.removeEventListener('keydown', keyDownListener))
</script>
