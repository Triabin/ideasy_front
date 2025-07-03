<!-- 主题切换组件 -->
<template>
  <div role="radiogroup" class="p-1 w-fit flex rounded-full border border-solid border-gray-500">
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        data-active="false"
        class="theme-switcher_switch"
        aria-label="切换到日间模式"
        aria-checked="false"
        @click="() => themeSwitcher('light')"
    >
      <svg
          style="color: currentcolor; width: 16px; height: 16px;"
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
          class="icon"
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
        class="theme-switcher_switch"
        aria-label="跟随浏览器"
        aria-checked="false"
        @click="() => themeSwitcher('system')"
    >
      <svg
          style="color: currentcolor; width: 16px; height: 16px;"
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
          class="icon"
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
        class="theme-switcher_switch"
        aria-label="切换到夜间模式"
        aria-checked="true"
        @click="() => themeSwitcher('dark')"
    >
      <svg
          style="color: currentcolor; width: 16px; height: 16px;"
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
          class="icon"
      >
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
      </svg>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import useSettingsStore from '@/stores/settingsStore';

const event = window.matchMedia("(prefers-color-scheme: dark)");
const { theme } = useSettingsStore();
const themeSwitcher = (mode: 'dark' | 'light' | 'system') => {
  const darkTheme = theme.darkThemeName || 'dim';
  const lightTheme = theme.lightThemeName || 'nord';
  switch (mode) {
    case 'dark':
      theme.mode = 'dark';
      theme.darkThemeName = darkTheme;
      document.documentElement.setAttribute('data-theme', darkTheme);
      break;
    case 'light':
      theme.mode = 'light';
      theme.lightThemeName = lightTheme;
      document.documentElement.setAttribute('data-theme', lightTheme);
      break;
    case "system":
    default:
      theme.mode = 'system';
      theme.darkThemeName = darkTheme;
      theme.lightThemeName = lightTheme;
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDarkMode ? darkTheme : lightTheme);
  }
};

onMounted(() => {
  theme.mode = theme.mode || 'system';
  themeSwitcher(theme.mode);
  event.addEventListener('change', themeSwitcher);
});

onUnmounted(() => {
  event.removeEventListener('change')
});
</script>

<style lang="css" scoped>
@import "@/styles/index.css";

.theme-switcher_switch {
  @apply w-8 h-8 flex justify-center items-center rounded-[inherit] border-0 bg-none cursor-pointer;
}

.theme-switcher_switch:hover > .icon {
  stroke: #323232;
}

.theme-switcher_switch:active {
  background-color: rgba(128, 128, 128, 0.35);
}

.theme-switcher_switch:active > .icon {
  stroke: white;
}

</style>
