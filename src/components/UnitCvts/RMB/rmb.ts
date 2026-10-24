import { type UnitDef } from '../units.ts';

/** 基准单位ID */
export const BASE_ID = 'yuan';

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'yuan', name: '元（块）', symbol: '¥', factor: 1 },
  { id: 'jiao', name: '角（毛）', symbol: '角', factor: 0.1 },
  { id: 'fen', name: '分', symbol: '分', factor: 0.01 },
  { id: 'li', name: '厘', symbol: '厘', factor: 0.001 },
  { id: 'hao', name: '毫', symbol: '毫', factor: 0.0001 },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: Array<[string, string]> = [
  ['1 元（块）', '10 角（毛）'],
  ['1 角（毛）', '10 分'],
  ['1 元（块）', '100 分'],
  ['1 分', '10 厘'],
  ['1 厘', '10 毫'],
]

const CN_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CN_UNITS = ['', '拾', '佰', '仟'];
const CN_SECTIONS = ['', '万', '亿', '万亿', '亿亿'];
/**
 * 将金额（单位：元）转换为中文大写金额
 * 例：1234.56 -> 壹仟贰佰叁拾肆元伍角陆分；整数则后缀「整」
 * @param yuan {number} 金额（元），最大支持万亿级，精确到分（四舍五入）
 * @returns {string} 大写金额，无法表示时返回空串
 */
export function rmbToChinese(yuan: number): string {
  if (!Number.isFinite(yuan)) return '';
  if (Math.abs(yuan) >= 1e16) return '';
  const neg = yuan < 0;
  const cents = Math.round(Math.abs(yuan) * 100);
  if (cents === 0) return '零元整';
  const jiao = Math.floor(cents / 10) % 10;
  const fen = cents % 10;

  // 整数部分按四位一节拼接（正确处理节间补零）
  let intStr = joinSections(centsToSections(Math.floor(cents / 100)));
  if (intStr) intStr += '元';

  // 小数部分
  let tail = '';
  if (jiao === 0 && fen === 0) tail = '整';
  else if (fen === 0) tail = CN_DIGITS[jiao] + '角';
  else if (jiao === 0) tail = (intStr ? '零' : '') + CN_DIGITS[fen] + '分';
  else tail = CN_DIGITS[jiao] + '角' + CN_DIGITS[fen] + '分';

  return (neg ? '负' : '') + intStr + tail;
}

/** 拼接各节，正确处理节间补零 */
function joinSections(secs: number[]): string {
  let out = '';
  secs.forEach((sec, i) => {
    const idxFromEnd = secs.length - 1 - i;
    if (sec === 0) return;
    const needZero =
      out !== '' &&
      (secs[i - 1] === 0 || Math.floor(sec / 1000) === 0);
    let secStr = sectionToStr(sec);
    if (needZero) out += '零';
    out += secStr + CN_SECTIONS[idxFromEnd];
  });
  return out;
}

/** 将整数拆成 4 位一节的数组（高位在前） */
function centsToSections(n: number): number[] {
  const secs: number[] = [];
  while (n > 0) {
    secs.unshift(n % 10000);
    n = Math.floor(n / 10000);
  }
  return secs;
}

/** 0~9999 转大写（不含节权位） */
function sectionToStr(n: number): string {
  let out = '';
  let zeroHold = false;
  for (let p = 3; p >= 0; p--) {
    const d = Math.floor(n / 10 ** p) % 10;
    if (d === 0) {
      if (out) zeroHold = true;
    } else {
      if (zeroHold) out += '零';
      zeroHold = false;
      out += CN_DIGITS[d] + CN_UNITS[p];
    }
  }
  return out;
}
