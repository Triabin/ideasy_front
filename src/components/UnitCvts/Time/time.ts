import type {UnitDef} from "@/components/UnitCvts/units.ts";

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'ns', name: '纳秒', symbol: 'ns', factor: 1e-9 },
  { id: 'us', name: '微秒', symbol: 'μs', factor: 1e-6 },
  { id: 'ms', name: '毫秒', symbol: 'ms', factor: 1e-3 },
  { id: 's', name: '秒', symbol: 's', factor: 1 },
  { id: 'min', name: '分钟', symbol: 'min', factor: 60 },
  { id: 'h', name: '小时', symbol: 'h', factor: 3600 },
  { id: 'd', name: '天（日）', symbol: 'd', factor: 86400 },
  { id: 'wk', name: '周', symbol: 'wk', factor: 604800 },
  { id: 'mo', name: '月（平均）', symbol: 'mo', factor: 2629800 },
  { id: 'a365', name: '年（365天）', symbol: 'a', factor: 31536000 },
  { id: 'a36525', name: '儒略年', symbol: 'a(J)', factor: 31557600 },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: [string, string][] = [
  ['1 分钟', '60 秒'],
  ['1 小时', '60 分钟 = 3600 秒'],
  ['1 天', '24 小时 = 86400 秒'],
  ['1 周', '7 天'],
  ['1 月（平均）', '≈ 30.44 天'],
  ['1 年（平年）', '365 天'],
]
