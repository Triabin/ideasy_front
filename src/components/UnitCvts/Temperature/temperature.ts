import { type UnitDef } from '../units.ts';

/** 基准单位ID */
export const BASE_ID = 'c';

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'c', name: '摄氏度', symbol: '°C' },
  { id: 'f', name: '华氏度', symbol: '°F' },
  { id: 'k', name: '开尔文', symbol: 'K' },
  { id: 'r', name: '兰氏度', symbol: '°R' },
  { id: 'de', name: '列氏度', symbol: '°Ré' },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: Array<[string, string]> = [
  ['°F', '°C × 9/5 + 32'],
  ['K', '°C + 273.15'],
  ['°R', '°F + 459.67'],
  ['水的冰点', '0 °C = 32 °F = 273.15 K'],
  ['水的沸点', '100 °C = 212 °F = 373.15 K'],
]

/** 将某温度单位值转为摄氏度 */
export function tempToC(value: number, unitId: string): number {
  switch (unitId) {
    case 'c': return value;
    case 'f': return (value - 32) * 5 / 9;
    case 'k': return value - 273.15;
    case 'r': return (value - 491.67) * 5 / 9; // 兰氏度：°R = °F + 459.67
    case 'de': return value * 100 / 60;        // 列氏度：1°Ré = 100/60 °C（冰点0，沸点60）
    default: throw new Error(`未知温度单位：${unitId}`);
  }
}

/** 将摄氏度转为某温度单位值 */
export function cToTemp(c: number, unitId: string): number {
  switch (unitId) {
    case 'c': return c;
    case 'f': return c * 9 / 5 + 32;
    case 'k': return c + 273.15;
    case 'r': return (c * 9 / 5 + 32) + 459.67;
    case 'de': return c * 60 / 100;
    default: throw new Error(`未知温度单位：${unitId}`);
  }
}
