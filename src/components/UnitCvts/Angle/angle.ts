import type { UnitDef } from '../units.ts';

/** 基准单位ID */
export const BASE_ID = 'deg';

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'deg', name: '度', symbol: '°', factor: 1 },
  { id: 'min_a', name: '角分', symbol: '′', factor: 1 / 60 },
  { id: 'sec_a', name: '角秒', symbol: '″', factor: 1 / 3600 },
  { id: 'rad', name: '弧度', symbol: 'rad', factor: 180 / Math.PI },
  { id: 'gon', name: '百分度（梯度）', symbol: 'gon', factor: 0.9 },
  { id: 'turn', name: '转（周）', symbol: 'tr', factor: 360 },
  { id: 'quad', name: '象限（直角）', symbol: 'quad', factor: 90 },
  { id: 'point', name: '罗盘点', symbol: 'pt', factor: 11.25 },
  { id: 'mas', name: '毫角秒', symbol: 'mas', factor: 1 / 3600000 },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: [string, string][] = [
  ['1 直角', '90°'],
  ['1 平角', '180°'],
  ['1 周角', '360° = 2π rad'],
  ['1 弧度 (rad)', '≈ 57.2958°'],
  ['1 百分度 (gon)', '0.9°'],
]
