import type {UnitDef} from "@/components/UnitCvts/units.ts";

/** 基准单位ID */
export const BASE_ID = 'J';

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'J', name: '焦耳', symbol: 'J', factor: 1 },
  { id: 'kJ', name: '千焦', symbol: 'kJ', factor: 1e3 },
  { id: 'MJ', name: '兆焦', symbol: 'MJ', factor: 1e6 },
  { id: 'GJ', name: '吉焦', symbol: 'GJ', factor: 1e9 },
  { id: 'cal', name: '卡（小卡）', symbol: 'cal', factor: 4.184 },
  { id: 'kcal', name: '千卡（大卡）', symbol: 'kcal', factor: 4184 },
  { id: 'Wh', name: '瓦时', symbol: 'Wh', factor: 3600 },
  { id: 'kWh', name: '千瓦时（度）', symbol: 'kW·h', factor: 3.6e6 },
  { id: 'MWh', name: '兆瓦时', symbol: 'MW·h', factor: 3.6e9 },
  { id: 'BTU', name: '英热单位', symbol: 'BTU', factor: 1055.05585262 },
  { id: 'eV', name: '电子伏特', symbol: 'eV', factor: 1.602176634e-19 },
  { id: 'erg', name: '尔格', symbol: 'erg', factor: 1e-7 },
  { id: 'toe', name: '吨油当量', symbol: 'toe', factor: 4.1868e10 },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: [string, string][] = [
  ['1 千焦 (kJ)', '1000 焦耳'],
  ['1 大卡 (kcal)', '4184 焦耳'],
  ['1 瓦时 (Wh)', '3600 焦耳'],
  ['1 千瓦时 (度)', '3.6 × 10⁶ 焦耳'],
  ['1 英热单位 (BTU)', '≈ 1055.06 焦耳'],
  ['1 电子伏 (eV)', '≈ 1.602 × 10⁻¹⁹ 焦耳'],
]
