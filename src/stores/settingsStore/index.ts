import { defineStore } from 'pinia';
import { reactive } from 'vue';

const useSettingsStore = defineStore('settingsStore', () => {
  const theme: { mode: 'light' | 'dark' | 'system', darkThemeName: string, lightThemeName: string } = reactive({
    mode: 'system',
    darkThemeName: 'dim',
    lightThemeName: 'nord',
  });

  return { theme };
}, {
  persist: true
});

export default useSettingsStore;