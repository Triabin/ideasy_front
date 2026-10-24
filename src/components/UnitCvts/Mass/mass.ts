import type {UnitDef} from "@/components/UnitCvts/units.ts";

/** 基准单位ID */
export const BASE_ID = 'kg';

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'mg', name: '毫克', symbol: 'mg', factor: 1e-6 },
  { id: 'g', name: '克', symbol: 'g', factor: 1e-3 },
  { id: 'kg', name: '千克（公斤）', symbol: 'kg', factor: 1 },
  { id: 't', name: '吨', symbol: 't', factor: 1e3 },
  { id: 'q', name: '担（百斤）', symbol: '担', factor: 50 },
  { id: 'jin', name: '斤', symbol: '斤', factor: 0.5 },
  { id: 'liang', name: '两', symbol: '两', factor: 0.05 },
  { id: 'qian', name: '钱', symbol: '钱', factor: 0.005 },
  { id: 'lb', name: '磅', symbol: 'lb', factor: 0.45359237 },
  { id: 'oz', name: '盎司', symbol: 'oz', factor: 0.028349523125 },
  { id: 'ston', name: '英吨（长吨）', symbol: 'long t', factor: 1016.0469088 },
  { id: 'ton', name: '美吨（短吨）', symbol: 'short t', factor: 907.18474 },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: [string, string][] = [
  ['1 吨 (t)', '1000 千克'],
  ['1 千克（公斤）', '1000 克'],
  ['1 斤', '500 克'],
  ['1 两', '50 克'],
  ['1 磅 (lb)', '≈ 0.4536 千克'],
  ['1 盎司 (oz)', '≈ 28.35 克'],
]
