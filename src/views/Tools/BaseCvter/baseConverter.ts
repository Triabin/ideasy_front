/**
 * 进制转换核心逻辑（纯函数，无 DOM 依赖）
 * 使用 BigInt 实现，支持任意大小整数，支持 2 ~ 36 任意进制
 */

/** 进制转换失败时抛出的错误 */
export class BaseParseError extends Error {}

/** 各进制的展示名称（常用进制） */
export const BASE_NAMES: Record<number, string> = {
  2: '二进制 Binary',
  8: '八进制 Octal',
  10: '十进制 Decimal',
  16: '十六进制 Hexadecimal',
};

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * 校验进制是否合法（2 ~ 36 的整数）
 * @param base {number} 进制
 */
export function isValidBase(base: number): boolean {
  return Number.isInteger(base) && base >= 2 && base <= 36;
}

/**
 * 将某进制的数字字符串解析为 BigInt 数值
 * 支持可选的前缀（0b / 0o / 0x）与负号，允许下划线分隔符
 * @param str {string} 数字字符串
 * @param base {number} 该字符串所处的进制（2~36）
 * @returns {bigint} 解析后的数值
 * @throws {BaseParseError} 解析失败时抛出
 */
export function parseToBigInt(str: string, base: number): bigint {
  let s = String(str ?? '').trim().toLowerCase().replace(/_/g, '');
  if (!isValidBase(base)) throw new BaseParseError(`非法进制：${base}，仅支持 2 ~ 36`);
  if (!s) throw new BaseParseError('请输入要转换的数值');

  // 处理符号
  let negative = false;
  if (/^[-+]/.test(s)) {
    negative = s[0] === '-';
    s = s.slice(1);
  }

  // 处理前缀，并校验前缀与所选进制一致
  const prefixMap: Record<string, number> = { '0b': 2, '0o': 8, '0x': 16 };
  const prefix = s.slice(0, 2);
  if (prefixMap[prefix] !== undefined) {
    if (prefixMap[prefix] !== base) {
      throw new BaseParseError(`前缀 "${prefix}" 与所选进制（${base} 进制）不匹配`);
    }
    s = s.slice(2);
  }
  if (!s) throw new BaseParseError('数值为空');

  // 逐字符校验是否属于该进制的合法数字
  const limit = DIGITS.slice(0, base);
  for (const ch of s) {
    if (!limit.includes(ch)) {
      throw new BaseParseError(`"${ch}" 不是 ${base} 进制下的合法数字`);
    }
  }

  // 逐位累乘方式解析，避免兼容性问题
  const value = parseDigits(s, base);
  return negative ? -value : value;
}

/** 逐位累乘解析无符号数字串 */
function parseDigits(s: string, base: number): bigint {
  const b = BigInt(base);
  let value = 0n;
  for (const ch of s) {
    const d = DIGITS.indexOf(ch);
    if (d < 0) throw new BaseParseError(`"${ch}" 不是合法数字`);
    value = value * b + BigInt(d);
  }
  return value;
}

/**
 * 将 BigInt 数值转为指定进制的字符串（小写，带 0b/0o/0x 风格前缀可选）
 * @param value {bigint} 数值
 * @param base {number} 目标进制（2~36）
 * @param withPrefix {boolean} 是否附加常见前缀（仅对 2/8/16 有效）
 * @param upper {boolean} 字母部分是否大写
 * @returns {string} 转换结果
 */
export function fromBigInt(value: bigint, base: number, withPrefix: boolean = false, upper: boolean = false): string {
  if (!isValidBase(base)) throw new BaseParseError(`非法进制：${base}，仅支持 2 ~ 36`);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const b = BigInt(base);
  let s = '';
  if (abs === 0n) {
    s = '0';
  } else {
    let v = abs;
    while (v > 0n) {
      s = DIGITS[Number(v % b)] + s;
      v /= b;
    }
  }
  if (upper) s = s.toUpperCase();
  if (withPrefix) {
    const p = base === 2 ? '0b' : base === 8 ? '0o' : base === 16 ? '0x' : '';
    if (p) s = (upper ? p.toUpperCase() : p) + s;
  }
  return (negative ? '-' : '') + s;
}

/**
 * 按每 group 位分组（默认 4 位一组，即十六进制对齐），组间用分隔符连接
 * @param str {string} 数字串（不含前缀/符号）
 * @param group {number} 每组位数
 * @param sep {string} 分隔符
 */
export function groupDigits(str: string, group: number = 4, sep: string = ' '): string {
  const m = /^(-?)([\s\S]*)$/.exec(str);
  const sign = m?.[1] ?? '';
  const body = m?.[2] ?? str;
  const parts: string[] = [];
  for (let i = body.length; i > 0; i -= group) {
    parts.unshift(body.slice(Math.max(0, i - group), i));
  }
  return sign + parts.join(sep);
}

/**
 * 统计数值的二进制位宽（最小表示位数，不含符号位）
 * @param value {bigint} 数值
 */
export function bitLength(value: bigint): number {
  const abs = value < 0n ? -value : value;
  if (abs === 0n) return 0;
  let n = 0n;
  let v = abs;
  while (v > 0n) {
    v >>= 1n;
    n++;
  }
  return Number(n);
}
