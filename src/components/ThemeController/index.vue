<!-- 主题切换组件 -->
<template>
  <div role="radiogroup" class="p-1 w-fit flex rounded-full border border-solid border-gray-500">
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        data-active="false"
        :class="'btn btn-ghost btn-circle' + (theme.mode === 'light' ? ' selected' : '')"
        title="切换到日间模式"
        aria-checked="false"
        @click="() => toggleTheme('light')"
    >
      <svg
          class="text-current w-4 h-4"
          width="24"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke="currentColor"
          shape-rendering="geometricPrecision"
          height="24"
          fill="none"
          data-testid="geist-icon"
      >
        <circle r="5" cy="12" cx="12"></circle>
        <path d="M12 1v2"></path>
        <path d="M12 21v2"></path>
        <path d="M4.22 4.22l1.42 1.42"></path>
        <path d="M18.36 18.36l1.42 1.42"></path>
        <path d="M1 12h2"></path>
        <path d="M21 12h2"></path>
        <path d="M4.22 19.78l1.42-1.42"></path>
        <path d="M18.36 5.64l1.42-1.42"></path>
      </svg>
    </button>
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        data-active="false"
        :class="'btn btn-ghost btn-circle' + (theme.mode === 'system' ? ' selected' : '')"
        title="跟随浏览器"
        aria-checked="false"
        @click="() => toggleTheme('system')"
    >
      <svg
          class="text-current w-4 h-4"
          width="24"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke="currentColor"
          shape-rendering="geometricPrecision"
          height="24"
          fill="none"
          data-testid="geist-icon"
      >
        <rect ry="2" rx="2" height="14" width="20" y="3" x="2"></rect>
        <path d="M8 21h8"></path>
        <path d="M12 17v4"></path>
      </svg>
    </button>
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        data-active="true"
        :class="'btn btn-ghost btn-circle' + (theme.mode === 'dark' ? ' selected' : '')"
        title="切换到夜间模式"
        aria-checked="true"
        @click="() => toggleTheme('dark')"
    >
      <svg
          class="text-current w-4 h-4"
          width="24"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke="currentColor"
          shape-rendering="geometricPrecision"
          height="24"
          fill="none"
          data-testid="geist-icon"
      >
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
      </svg>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { toRef, onMounted, onUnmounted } from 'vue';
import useSettingsStore from '@/stores/settingsStore';

const event = window.matchMedia("(prefers-color-scheme: dark)");
const { initTheme, toggleTheme } = useSettingsStore();
const theme = toRef(useSettingsStore(), 'theme');

onMounted(() => {
  initTheme();
  event.addEventListener('change', (e) => toggleTheme);
});

onUnmounted(() => {
  event.removeEventListener('change', (e) => toggleTheme());
});
</script>

<style lang="css" scoped>
.selected {
  background-color: color-mix(in oklab, var(--btn-color, var(--color-base-200) /* var(--color-base-200) */), #000 7%);
}
</style>
