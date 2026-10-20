import { type UnitDef } from '../units.ts';

/** 基准单位ID */
export const BASE_ID = 'm';

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'pm', name: '皮米', symbol: 'pm', factor: 1e-12 },
  { id: 'nm', name: '纳米', symbol: 'nm', factor: 1e-9 },
  { id: 'um', name: '微米', symbol: 'μm', factor: 1e-6 },
  { id: '丝', name: '丝（忽米）', symbol: 'cmm', factor: 1e-5 },
  { id: 'mm', name: '毫米', symbol: 'mm', factor: 1e-3 },
  { id: 'cm', name: '厘米', symbol: 'cm', factor: 1e-2 },
  { id: 'dm', name: '分米', symbol: 'dm', factor: 1e-1 },
  { id: 'm', name: '米', symbol: 'm', factor: 1 },
  { id: 'km', name: '千米（公里）', symbol: 'km', factor: 1e3 },
  { id: 'zhang', name: '丈', symbol: '丈', factor: 10 / 3 },
  { id: 'chi', name: '尺', symbol: '尺', factor: 1 / 3 },
  { id: 'cun', name: '寸', symbol: '寸', factor: 1 / 30 },
  { id: 'li', name: '里', symbol: '里', factor: 500 },
  { id: 'nmi', name: '海里', symbol: 'nmi', factor: 1852 },
  { id: 'ft', name: '英尺', symbol: 'ft', factor: 0.3048 },
  { id: 'in', name: '英寸', symbol: 'in', factor: 0.0254 },
  { id: 'yd', name: '码', symbol: 'yd', factor: 0.9144 },
  { id: 'mi', name: '英里', symbol: 'mi', factor: 1609.344 },
  { id: 'ly', name: '光年', symbol: 'ly', factor: 9.4607304725808e15 },
  { id: 'au', name: '天文单位', symbol: 'AU', factor: 1.495978707e11 },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: [string, string][] = [
  ['1 千米 (km)', '1000 米'],
  ['1 米 (m)', '100 厘米'],
  ['1 里', '500 米'],
  ['1 尺', '1/3 米 ≈ 0.3333 米'],
  ['1 英里 (mi)', '1609.344 米'],
  ['1 英寸 (in)', '2.54 厘米'],
  ['1 海里', '1852 米'],
  ['1 光年', '≈ 9.4607 × 10¹⁵ 米'],
]
