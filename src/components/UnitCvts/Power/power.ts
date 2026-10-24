import type {UnitDef} from "@/components/UnitCvts/units.ts";

/** 基准单位ID */
export const BASE_ID = 'W';

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'W', name: '瓦特', symbol: 'W', factor: 1 },
  { id: 'mW', name: '毫瓦', symbol: 'mW', factor: 1e-3 },
  { id: 'kW', name: '千瓦', symbol: 'kW', factor: 1e3 },
  { id: 'MW', name: '兆瓦', symbol: 'MW', factor: 1e6 },
  { id: 'GW', name: '吉瓦', symbol: 'GW', factor: 1e9 },
  { id: 'ps', name: '公马力（米制马力）', symbol: 'PS', factor: 735.49875 },
  { id: 'hp', name: '英马力（机械马力）', symbol: 'hp(I)', factor: 745.6998715822702 },
  { id: 'ehp', name: '电马力', symbol: 'hp(E)', factor: 746 },
  { id: 'btuS', name: '英热单位/秒', symbol: 'BTU/s', factor: 1055.05585262 },
  { id: 'kcalh', name: '千卡/小时', symbol: 'kcal/h', factor: 1.163 },
  { id: 'J_s', name: '焦耳/秒', symbol: 'J/s', factor: 1 },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: [string, string][] = [
  ['1 千瓦 (kW)', '1000 瓦'],
  ['1 兆瓦 (MW)', '1000 千瓦'],
  ['1 公马力 (PS)', '≈ 735.5 瓦'],
  ['1 英马力 (hp)', '≈ 745.7 瓦'],
  ['1 千瓦', '≈ 1.341 英马力'],
]
