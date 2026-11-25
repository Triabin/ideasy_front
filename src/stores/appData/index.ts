import { defineStore } from 'pinia';
import { ref } from 'vue';

/** 密码生成历史记录条目 */
export type PasswordGenRecord = {
  /** 生成时间戳（毫秒） */
  time: number;
  /** 生成的密码/PIN列表 */
  values: string[];
  /** 长度或位数 */
  length: number;
  /** 数量 */
  count: number;
  /** 是否PIN模式 */
  isPin: boolean;
  /** 字符集选项快照 */
  options: {
    lower: boolean;
    upper: boolean;
    digit: boolean;
    special: boolean;
    /** 本次生成使用的特殊字符集合（勾选特殊字符时） */
    specialChars?: string;
    excludeChars?: string;
  };
};

/** 计算器历史记录条目 */
export type CalculatorRecord = {
  /** 计算时间戳（毫秒） */
  time: number;
  /** 表达式（展示格式，含 ×÷ 等符号） */
  expr: string;
  /** 计算结果 */
  result: string;
};

const useAppDataStore = defineStore('appData', () => {
  /** 颜色转换历史 */
  const cvtColorHistories = ref<string[]>([]);

  /** 收藏的工具路径（按收藏先后顺序） */
  const favoriteTools = ref<string[]>([]);
  /** 最近使用的工具（最新在前，最多8条） */
  const recentTools = ref<{ path: string; time: number }[]>([]);

  /** 切换工具收藏状态 */
  const toggleFavoriteTool = (path: string) => {
    const idx = favoriteTools.value.indexOf(path);
    if (idx >= 0) favoriteTools.value.splice(idx, 1);
    else favoriteTools.value.push(path);
  };

  /** 记录一次工具使用 */
  const pushRecentTool = (path: string) => recentTools.value = [
    { path, time: Date.now() },
    ...recentTools.value.filter(r => r.path !== path).slice(0, 7)
  ];

  /** 密码生成最近记录（最多100条，最新在前） */
  const passwordGenRecords = ref<PasswordGenRecord[]>([]);

  /**
   * 存储一条密码生成记录
   * @param record {Omit<PasswordGenRecord, 'time'>} 记录内容（不含时间戳）
   */
  const pushPasswordGenRecord = (record: Omit<PasswordGenRecord, 'time'>) => passwordGenRecords.value = [
    { ...record, time: Date.now() },
    ...passwordGenRecords.value.slice(0, 99)
  ];

  /**
   * 删除指定下标的密码生成记录
   * @param index {number} 记录下标
   */
  const removePasswordGenRecord = (index: number) => passwordGenRecords.value.splice(index, 1);

  /**
   * 清空密码生成历史记录
   */
  const clearPasswordGenHistory = () => passwordGenRecords.value = [];

  /** 计算器历史记录（最多100条，最新在前） */
  const calculatorRecords = ref<CalculatorRecord[]>([]);

  /**
   * 存储一条计算器历史记录（与最近一条完全相同时忽略，避免连续按 = 产生重复）
   * @param record {Omit<CalculatorRecord, 'time'>} 记录内容（不含时间戳）
   */
  const pushCalculatorRecord = (record: Omit<CalculatorRecord, 'time'>) => {
    const last = calculatorRecords.value[0];
    if (last && last.expr === record.expr && last.result === record.result) return;
    calculatorRecords.value = [
      { ...record, time: Date.now() },
      ...calculatorRecords.value.slice(0, 99)
    ];
  };

  /**
   * 删除指定下标的计算器历史记录
   * @param index {number} 记录下标
   */
  const removeCalculatorRecord = (index: number) => calculatorRecords.value.splice(index, 1);

  /**
   * 清空计算器历史记录
   */
  const clearCalculatorHistory = () => calculatorRecords.value = [];

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

  return {
    cvtColorHistories, pushCvtColorHistory, clearCvtColorHistory,
    passwordGenRecords, pushPasswordGenRecord, removePasswordGenRecord, clearPasswordGenHistory,
    calculatorRecords, pushCalculatorRecord, removeCalculatorRecord, clearCalculatorHistory,
    favoriteTools, toggleFavoriteTool, recentTools, pushRecentTool
  };
}, { persist: true });

export default useAppDataStore;
