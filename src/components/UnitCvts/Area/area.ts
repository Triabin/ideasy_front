import type { UnitDef } from '../units.ts';

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'mm2', name: '平方毫米', symbol: 'mm²', factor: 1e-6 },
  { id: 'cm2', name: '平方厘米', symbol: 'cm²', factor: 1e-4 },
  { id: 'dm2', name: '平方分米', symbol: 'dm²', factor: 1e-2 },
  { id: 'm2', name: '平方米', symbol: 'm²', factor: 1 },
  { id: 'mu', name: '亩', symbol: '亩', factor: 2000 / 3 },
  { id: 'fen', name: '分（地积）', symbol: '分', factor: 200 / 3 },
  { id: 'liangdi', name: '厘（地积）', symbol: '厘', factor: 20 / 3 },
  { id: 'ha', name: '公顷', symbol: 'ha', factor: 1e4 },
  { id: 'km2', name: '平方公里', symbol: 'km²', factor: 1e6 },
  { id: 'ac', name: '英亩', symbol: 'ac', factor: 4046.8564224 },
  { id: 'ft2', name: '平方英尺', symbol: 'ft²', factor: 0.09290304 },
  { id: 'in2', name: '平方英寸', symbol: 'in²', factor: 6.4516e-4 },
  { id: 'yd2', name: '平方码', symbol: 'yd²', factor: 0.83612736 },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: [string, string][] = [
  ['1 平方米', '10000 平方厘米'],
  ['1 亩', '≈ 666.67 平方米'],
  ['1 公顷', '10000 平方米 = 15 亩'],
  ['1 平方公里', '100 公顷'],
  ['1 英亩', '≈ 4046.86 平方米'],
]
