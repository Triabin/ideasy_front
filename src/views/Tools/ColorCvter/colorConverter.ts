/**
 * 颜色格式转换核心逻辑（纯函数，无 DOM 依赖）
 */

/** 内部统一使用的 RGBA 模型，各通道取值范围 0~255，a 取值范围 0~1 */
export type Rgba = { r: number, g: number, b: number, a: number };

/** 支持的输入格式 */
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk';

/** 格式解析失败时抛出的错误 */
export class ColorParseError extends Error {}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const round = (v: number, digits: number = 0): number => {
  const p = 10 ** digits;
  return Math.round(v * p) / p;
};

/* ------------------------------ 解析 ------------------------------ */

/**
 * 解析颜色字符串，自动识别 hex / rgb() / rgba() / hsl() / hsv() / cmyk() 格式
 * @param input {string} 用户输入的颜色字符串
 * @returns {Rgba} 解析后的 RGBA 颜色
 * @throws {ColorParseError} 无法解析时抛出
 */
export function parseColor(input: string): Rgba {
  const s = String(input ?? '').trim().toLowerCase();
  if (!s) throw new ColorParseError('请输入颜色值');

  // hex：#RGB / #RGBA / #RRGGBB / #RRGGBBAA
  if (s.startsWith('#')) return parseHex(s);

  // 函数式：rgb(...) / rgba(...) / hsl(...) / hsv(...) / cmyk(...)，允许逗号或空格分隔
  const fnMatch = s.match(/^(rgba?|hsla?|hsv|cmyk)\s*\(([^)]*)\)$/);
  if (fnMatch) {
    const name = fnMatch[1];
    const parts = fnMatch[2]
      .replace(/\//g, ' ')   // 现代语法 rgb(0 0 0 / 50%)
      .split(/[\s,]+/)
      .filter(Boolean);
    if (name.startsWith('rgb')) return parseRgbFn(parts);
    if (name.startsWith('hsl')) return parseHslFn(parts);
    if (name === 'hsv') return parseHsvFn(parts);
    if (name === 'cmyk') return parseCmykFn(parts);
  }

  // 兼容裸数值：r,g,b[,a]
  const parts = s.split(/[,\s]+/).filter(Boolean);
  if (parts.length >= 3 && parts.length <= 4) return parseRgbFn(parts);

  throw new ColorParseError('无法识别的颜色格式');
}

function parseHex(s: string): Rgba {
  const body = s.slice(1);
  if (!/^[0-9a-f]+$/.test(body) || ![3, 4, 6, 8].includes(body.length)) {
    throw new ColorParseError('HEX 格式应为 #RGB / #RGBA / #RRGGBB / #RRGGBBAA');
  }
  if (body.length <= 4) {
    const r = parseInt(body[0], 16) * 17;
    const g = parseInt(body[1], 16) * 17;
    const b = parseInt(body[2], 16) * 17;
    const a = body.length === 4 ? parseInt(body[3], 16) * 17 / 255 : 1;
    return { r, g, b, a };
  }
  const r = parseInt(body.slice(0, 2), 16);
  const g = parseInt(body.slice(2, 4), 16);
  const b = parseInt(body.slice(4, 6), 16);
  const a = body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function toNumber(token: string): number {
  const m = token.match(/^(-?\d*\.?\d+)(%?)$/);
  if (!m) throw new ColorParseError(`无效的数值：${token}`);
  return parseFloat(m[1]);
}

function isPercent(token: string): boolean {
  return token.trim().endsWith('%');
}

function parseRgbFn(parts: string[]): Rgba {
  if (parts.length < 3 || parts.length > 4) throw new ColorParseError('RGB 需要 3~4 个分量');
  const conv = (t: string): number => (isPercent(t) ? clamp(toNumber(t) * 2.55, 0, 255) : clamp(toNumber(t), 0, 255));
  const r = conv(parts[0]);
  const g = conv(parts[1]);
  const b = conv(parts[2]);
  let a = 1;
  if (parts.length === 4) {
    a = isPercent(parts[3]) ? clamp(toNumber(parts[3]) / 100, 0, 1) : clamp(toNumber(parts[3]), 0, 1);
  }
  return { r, g, b, a };
}

function parseHslFn(parts: string[]): Rgba {
  if (parts.length < 3 || parts.length > 4) throw new ColorParseError('HSL 需要 3~4 个分量');
  const h = ((toNumber(parts[0]) % 360) + 360) % 360;
  const sv = (t: string): number => clamp(isPercent(t) ? toNumber(t) : toNumber(t) * 100, 0, 100);
  const s = sv(parts[1]);
  const l = sv(parts[2]);
  let a = 1;
  if (parts.length === 4) {
    a = isPercent(parts[3]) ? clamp(toNumber(parts[3]) / 100, 0, 1) : clamp(toNumber(parts[3]), 0, 1);
  }
  return { ...hslToRgb(h, s, l), a };
}

function parseHsvFn(parts: string[]): Rgba {
  if (parts.length !== 3) throw new ColorParseError('HSV 需要 3 个分量');
  const h = ((toNumber(parts[0]) % 360) + 360) % 360;
  const sv = (t: string): number => clamp(isPercent(t) ? toNumber(t) : toNumber(t) * 100, 0, 100);
  return hsvToRgb(h, sv(parts[1]), sv(parts[2]));
}

function parseCmykFn(parts: string[]): Rgba {
  if (parts.length !== 4) throw new ColorParseError('CMYK 需要 4 个分量');
  const v = (t: string): number => {
    const n = toNumber(t);
    // 不带 % 时按 0~1 归一化理解
    return clamp(isPercent(t) ? n : n * 100, 0, 100);
  };
  return cmykToRgb(v(parts[0]), v(parts[1]), v(parts[2]), v(parts[3]));
}

/* ------------------------------ 色彩空间互转 ------------------------------ */

export function rgbToHsl(r: number, g: number, b: number): { h: number, s: number, l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4; break;
    }
    h /= 6;
  }
  return { h: round(h * 360), s: round(s * 100), l: round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number): { r: number, g: number, b: number } {
  const sn = s / 100, ln = l / 100;
  if (sn === 0) {
    const v = round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hue2rgb = (t0: number): number => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const hn = ((h % 360) + 360) % 360 / 360;
  return {
    r: round(hue2rgb(hn + 1 / 3) * 255),
    g: round(hue2rgb(hn) * 255),
    b: round(hue2rgb(hn - 1 / 3) * 255),
  };
}

export function rgbToHsv(r: number, g: number, b: number): { h: number, s: number, v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn: h = ((gn - bn) / d) % 6; break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4; break;
    }
    h = round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s: round(s * 100), v: round(max * 100) };
}

export function hsvToRgb(h: number, s: number, v: number): Rgba {
  const sn = s / 100, vn = v / 100;
  const c = vn * sn;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = vn - c;
  return { r: round((r + m) * 255), g: round((g + m) * 255), b: round((b + m) * 255), a: 1 };
}

export function rgbToCmyk(r: number, g: number, b: number): { c: number, m: number, y: number, k: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return { c: round(c * 100), m: round(m * 100), y: round(y * 100), k: round(k * 100) };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): Rgba {
  const cn = c / 100, mn = m / 100, yn = y / 100, kn = k / 100;
  return {
    r: round(255 * (1 - cn) * (1 - kn)),
    g: round(255 * (1 - mn) * (1 - kn)),
    b: round(255 * (1 - yn) * (1 - kn)),
    a: 1,
  };
}

/* ------------------------------ 格式化输出 ------------------------------ */

const hex2 = (n: number): string => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0').toUpperCase();

export function formatHex({ r, g, b, a }: Rgba, upper: boolean = true): string {
  const full = a < 1 ? hex2(a * 255) : '';
  const s = `#${hex2(r)}${hex2(g)}${hex2(b)}${full}`;
  return upper ? s : s.toLowerCase();
}

export function formatCss({ r, g, b, a }: Rgba): string {
  if (a >= 1) return `rgb(${round(r)}, ${round(g)}, ${round(b)})`;
  return `rgba(${round(r)}, ${round(g)}, ${round(b)}, ${round(a, 2)})`;
}

export function formatHslCss({ r, g, b, a }: Rgba): string {
  const { h, s, l } = rgbToHsl(r, g, b);
  if (a >= 1) return `hsl(${h}, ${s}%, ${l}%)`;
  return `hsla(${h}, ${s}%, ${l}%, ${round(a, 2)})`;
}

export function formatHsv({ r, g, b }: Rgba): string {
  const { h, s, v } = rgbToHsv(r, g, b);
  return `hsv(${h}, ${s}%, ${v}%)`;
}

export function formatCmyk({ r, g, b }: Rgba): string {
  const { c, m, y, k } = rgbToCmyk(r, g, b);
  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

/* ------------------------------ 调色辅助 ------------------------------ */

/**
 * 调整亮度（基于 HSL 的 L 通道）
 * @param color {Rgba} 源颜色
 * @param delta {number} 亮度增量（百分点），正数变亮、负数变暗
 */
export function adjustLightness(color: Rgba, delta: number): Rgba {
  const { h, s, l } = rgbToHsl(color.r, color.g, color.b);
  const nl = clamp(l + delta, 0, 100);
  return { ...hslToRgb(h, s, nl), a: color.a };
}

/**
 * 生成色阶（从浅到深）
 * @param color {Rgba} 基准颜色
 * @param steps {number} 阶数
 */
export function generateScale(color: Rgba, steps: number = 9): Rgba[] {
  const { h, s } = rgbToHsl(color.r, color.g, color.b);
  const out: Rgba[] = [];
  for (let i = 0; i < steps; i++) {
    // 在 95% ~ 20% 之间围绕原色明度取点
    const t = steps === 1 ? 0.5 : i / (steps - 1);
    const li = 95 - t * 75;
    out.push({ ...hslToRgb(h, s, li), a: color.a });
  }
  return out;
}

/**
 * 计算相对亮度（WCAG）
 */
export function relativeLuminance({ r, g, b }: Rgba): number {
  const f = (c: number): number => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * 计算与白色的对比度（WCAG），返回形如 4.5:1 的字符串及等级说明
 */
export function contrastWithWhite(color: Rgba): { ratio: number, level: 'AAA' | 'AA' | 'AA Large' | 'Fail' } {
  const lum = relativeLuminance(color);
  const ratio = 1.05 / (lum + 0.05);
  let level: 'AAA' | 'AA' | 'AA Large' | 'Fail' = 'Fail';
  if (ratio >= 7) level = 'AAA';
  else if (ratio >= 4.5) level = 'AA';
  else if (ratio >= 3) level = 'AA Large';
  return { ratio: round(ratio, 2), level };
}
