import { defineStore } from 'pinia';
import { ref } from 'vue';

const useAppDataStore = defineStore('appData', () => {
  /** 颜色转换历史 */
  const cvtColorHistories = ref<string[]>([]);

  /**
   * 存储转换颜色值
   * @param hex 要记录转换历史的RGB十六进制值
   */
  const pushCvtColorHistory = (hex: string) => cvtColorHistories.value = [
    hex,
    ...cvtColorHistories.value.filter(h => h !== hex).slice(0, 12)
  ];
  /**
   * 清空颜色历史记录存储
   */
  const clearCvtColorHistory = () => cvtColorHistories.value = [];

  return { cvtColorHistories, pushCvtColorHistory, clearCvtColorHistory };
}, { persist: true });

export default useAppDataStore;
