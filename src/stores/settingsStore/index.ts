import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { getOS } from '@/common/utils';

const useSettingsStore = defineStore('settingsStore', () => {
  const theme: { mode: 'light' | 'dark' | 'system', darkThemeName: string, lightThemeName: string } = reactive({
    mode: 'system',
    darkThemeName: 'dim',
    lightThemeName: 'nord',
  });

  /** 当前真正的主题模式（夜间或者白天） */
  const currRealMode = ref<'light' | 'dark'>('light');

  /** 系统类型 */
  const osType = ref<'Android' | 'iOS' | 'Windows' | 'MacOS' | 'Linux' | 'Unknown'>(getOS());

  /** 初始化主题 */
  function initTheme() {
    if (theme.mode === undefined) {
      theme.mode = 'system';
      console.warn('主题模式丢失，恢复为默认跟随系统');
    }
    if (theme.darkThemeName === undefined) {
      theme.darkThemeName = 'dim';
      console.warn('暗黑主题名称丢失，恢复为默认dim');
    }
    if (theme.lightThemeName === undefined) {
      theme.lightThemeName = 'nord';
      console.warn('浅色主题名称丢失，恢复为默认nord');
    }
    if (theme.mode === 'system') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDarkMode ? theme.darkThemeName : theme.lightThemeName);
      currRealMode.value = isDarkMode ? 'dark' : 'light';
    } else {
      document.documentElement.setAttribute('data-theme', theme.mode === 'dark' ? theme.darkThemeName : theme.lightThemeName);
      currRealMode.value = theme.mode;
    }
  }

  /** 切换主题 */
  function toggleTheme(mode: 'dark' | 'light' | 'system' = 'system') {
    theme.mode = mode;
    theme.darkThemeName = theme.darkThemeName || 'dim';
    theme.lightThemeName = theme.lightThemeName || 'nord';
    switch (mode) {
      case 'system':
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', isDarkMode ? theme.darkThemeName : theme.lightThemeName);
        currRealMode.value = isDarkMode ? 'dark' : 'light';
        break;
      case "light":
        document.documentElement.setAttribute('data-theme', theme.lightThemeName);
        currRealMode.value = 'light';
        break;
      case "dark":
        document.documentElement.setAttribute('data-theme', theme.darkThemeName);
        currRealMode.value = 'dark';
        break;
    }
  }

  return { theme, currRealMode, osType, initTheme, toggleTheme };
}, {
  persist: {
    storage: localStorage,
    omit: ['currRealMode']
  }
});

export default useSettingsStore;
