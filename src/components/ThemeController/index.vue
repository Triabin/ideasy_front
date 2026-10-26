<!-- 主题切换组件 -->
<template>
  <div role="radiogroup" class="p-1 gap-1 flex rounded-full border border-solid border-gray-300">
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        data-active="false"
        :class="'btn btn-sm btn-ghost btn-circle' + (theme.mode === 'light' ? ' selected' : '')"
        title="切换到日间模式"
        aria-checked="false"
        @click="() => toggleTheme('light')"
    >
      <ThemeLight/>
    </button>
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        data-active="false"
        :class="'btn btn-sm btn-ghost btn-circle' + (theme.mode === 'system' ? ' selected' : '')"
        title="跟随浏览器"
        aria-checked="false"
        @click="() => toggleTheme('system')"
    >
      <ThemeAuto/>
    </button>
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        data-active="false"
        :class="'btn btn-sm btn-ghost btn-circle' + (theme.mode === 'dark' ? ' selected' : '')"
        title="切换到夜间模式"
        aria-checked="false"
        @click="() => toggleTheme('dark')"
    >
      <ThemeDark/>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { toRef, onMounted, onUnmounted } from 'vue';
import useSettingsStore from '@/stores/settingsStore';
import ThemeAuto from '@/components/icons/ThemeAuto.vue';
import ThemeLight from '@/components/icons/ThemeLight.vue';
import ThemeDark from '@/components/icons/ThemeDark.vue';

const event = window.matchMedia("(prefers-color-scheme: dark)");
const { initTheme, toggleTheme } = useSettingsStore();
const theme = toRef(useSettingsStore(), 'theme');

onMounted(() => {
  initTheme();
  event.addEventListener('change', (e: Event) => toggleTheme());
});

onUnmounted(() => {
  event.removeEventListener('change', (e: Event) => toggleTheme());
});
</script>

<style lang="css" scoped>
.selected {
  background-color: color-mix(in oklab, var(--btn-color, var(--color-base-200)), #000 7%);
}
</style>
