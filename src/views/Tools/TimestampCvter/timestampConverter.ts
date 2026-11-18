/** 时间戳转换工具的核心逻辑（纯函数，与页面组件解耦） */

/** 秒级时间戳上限（11 位，约公元 5138 年），用于自动识别毫秒/秒 */
export const SEC_TS_MAX = 99999999999;

/** 时间单位 */
export type TimeUnit = 'auto' | 's' | 'ms' | 'us' | 'ns';

/** 时区模式：本地 / UTC / 固定偏移小时 */
export type TimeZoneMode = 'local' | 'utc' | 'offset';

/** 解析后的时间戳信息 */
export interface ParsedTimestamp {
  /** 毫秒级时间戳 */
  ms: number;
  /** 识别出的原始单位 */
  unit: Exclude<TimeUnit, 'auto'>;
}

/**
 * 将时间戳数字解析为毫秒值
 * @param value {number} 时间戳数值
 * @param unit {TimeUnit} 单位，auto 时按位数自动识别
 * @returns {ParsedTimestamp | null} 解析结果，无效返回 null
 */
export function parseTimestamp(value: number, unit: TimeUnit = 'auto'): ParsedTimestamp | null {
  if (!Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  let ms: number;
  let u: Exclude<TimeUnit, 'auto'>;
  if (unit === 'auto') {
    // 按位数粗略判断：<=11位视为秒，其后依次毫秒/微秒/纳秒
    if (abs <= SEC_TS_MAX) {
      u = 's';
      ms = value * 1e3;
    } else if (abs <= SEC_TS_MAX * 1e3) {
      u = 'ms';
      ms = value;
    } else if (abs <= SEC_TS_MAX * 1e6) {
      u = 'us';
      ms = value / 1e3;
    } else {
      u = 'ns';
      ms = value / 1e6;
    }
  } else {
    u = unit;
    switch (unit) {
      case 's':
        ms = value * 1e3;
        break;
      case 'ms':
        ms = value;
        break;
      case 'us':
        ms = value / 1e3;
        break;
      case 'ns':
        ms = value / 1e6;
        break;
    }
  }
  ms = Math.round(ms);
  // JS Date 有效范围：±8.64e15 毫秒
  if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) return null;
  return { ms, unit: u };
}

/**
 * 从文本解析时间戳，支持自动识别单位
 * @param text {string} 用户输入的文本
 * @param unit {TimeUnit} 指定单位或自动
 * @returns {ParsedTimestamp | null} 解析结果
 */
export function parseTimestampText(text: string, unit: TimeUnit = 'auto'): ParsedTimestamp | null {
  const raw = text.trim().replace(/[,_\s]/g, '');
  if (!raw) return null;
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  return parseTimestamp(Number(raw), unit);
}

/**
 * 带时区信息的 Date 子类：
 * 将时间戳平移后使用 UTC 取值，使日期片段等同于指定时区的墙上时间；
 * 同时覆盖 getTimezoneOffset，保证 Date.prototype.format 的 Z 占位符输出正确时区。
 */
class ZonedDate extends Date {
  /** 目标时区相对 UTC 的偏移分钟数（东为正） */
  private readonly zoneOffsetMinutes: number;

  constructor(ms: number, zoneOffsetMinutes: number) {
    super(ms + zoneOffsetMinutes * 60e3);
    this.zoneOffsetMinutes = zoneOffsetMinutes;
  }

  getFullYear() { return this.getUTCFullYear(); }
  getMonth() { return this.getUTCMonth(); }
  getDate() { return this.getUTCDate(); }
  getDay() { return this.getUTCDay(); }
  getHours() { return this.getUTCHours(); }
  getMinutes() { return this.getUTCMinutes(); }
  getSeconds() { return this.getUTCSeconds(); }
  getMilliseconds() { return this.getUTCMilliseconds(); }
  getTimezoneOffset() { return -this.zoneOffsetMinutes; }
}

/**
 * 调用全局 Date.prototype.format 按指定时区格式化时间
 * @param ms {number} 毫秒时间戳
 * @param pattern {string} 格式串（语法与 Date.prototype.format 一致）
 * @param mode {TimeZoneMode} 时区模式
 * @param offsetHours {number} mode 为 offset 时的 UTC 偏移小时数
 * @returns {string} 格式化后的字符串
 */
export function formatDate(
  ms: number,
  pattern: string,
  mode: TimeZoneMode = 'local',
  offsetHours: number = 0
): string {
  if (mode === 'local') return new Date(ms).format(pattern);
  const zoneOffsetMinutes = mode === 'utc' ? 0 : Math.round(offsetHours * 60);
  return new ZonedDate(ms, zoneOffsetMinutes).format(pattern);
}

/** 解析用的格式符（与 Date.prototype.format 的格式符一致，方括号为字面量） */
const PARSE_TOKEN_RE = /\[[^\]]*\]|ap|AP|y+|M+|d+|H+|h+|m+|s+|S+|q|Q|E+|e+|Z/g;

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 时区模式对应的 UTC 偏移分钟数（东为正），本地模式取 at 时刻的实际偏移 */
const getZoneOffsetMinutes = (mode: TimeZoneMode, offsetHours: number, at: number = Date.now()): number => {
  if (mode === 'utc') return 0;
  if (mode === 'offset') return Math.round(offsetHours * 60);
  return -new Date(at).getTimezoneOffset();
};

/** 读取某时刻在指定时区下的日期时间片段（month 从 1 开始） */
const getZonedParts = (ms: number, mode: TimeZoneMode, offsetHours: number) => {
  const d = new ZonedDate(ms, getZoneOffsetMinutes(mode, offsetHours, ms));
  return {
    year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
    hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds(),
  };
};

/** 校验时间戳在指定时区下回读出的日期时间是否与输入一致（排除 2026-02-30 这类进位） */
const sameZoneParts = (
  ms: number,
  zoneMinutes: number,
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number }
): boolean => {
  const d = new ZonedDate(ms, zoneMinutes);
  return d.getFullYear() === parts.year && d.getMonth() === parts.month - 1 && d.getDate() === parts.day
    && d.getHours() === parts.hour && d.getMinutes() === parts.minute && d.getSeconds() === parts.second;
};

/**
 * 按格式串把日期时间文本解析为毫秒时间戳
 * @param text {string} 日期时间文本，如 "2026-10-19 12:00:00"
 * @param pattern {string} 与文本对应的格式串（语法与 Date.prototype.format 一致）
 * @param mode {TimeZoneMode} 文本未携带时区（Z）时使用的时区模式
 * @param offsetHours {number} mode 为 offset 时的 UTC 偏移小时数
 * @returns {number | null} 毫秒时间戳，格式不匹配或日期非法时返回 null
 */
export function parseDateTimeByFormat(
  text: string,
  pattern: string,
  mode: TimeZoneMode = 'local',
  offsetHours: number = 0
): number | null {
  const raw = text.trim();
  if (!raw || !pattern.trim()) return null;

  // 1. 按格式串生成正则：字面量转义，参与取值的格式符各生成一个捕获组
  let source = '^';
  const tokens: string[] = [];
  let last = 0;
  pattern.replace(PARSE_TOKEN_RE, (token: string, offset: number) => {
    source += escapeRegExp(pattern.slice(last, offset));
    last = offset + token.length;
    if (token.startsWith('[')) {
      // 方括号内为字面量，不捕获
      source += escapeRegExp(token.slice(1, -1));
      return token;
    }
    switch (token[0]) {
      case 'y': source += token.length === 2 ? '(\\d{2})' : token.length === 1 ? '(\\d{1,4})' : '(\\d{4})'; break;
      case 'M':
      case 'd':
      case 'H':
      case 'h':
      case 'm':
      case 's': source += '(\\d{1,2})'; break;
      case 'S': source += '(\\d{1,3})'; break;
      case 'a':
      case 'A': source += '([aApP][mM])'; break;
      case 'Z': source += '(Z|[+-]\\d{2}:?\\d{2})'; break;
      // 星期与季度只参与匹配，不参与取值
      case 'q': source += '(?:\\d{1,2})'; break;
      case 'Q': source += '(?:[一二三四])'; break;
      case 'E': source += '(?:星期[一二三四五六日]|周[一二三四五六日]|[一二三四五六日])'; break;
      case 'e': source += '(?:[A-Za-z]+\\.?)'; break;
    }
    if (!'qQEe'.includes(token[0])) tokens.push(token);
    return token;
  });
  source += escapeRegExp(pattern.slice(last)) + '$';

  const matched = raw.match(new RegExp(source));
  if (!matched) return null;

  // 2. 格式串中缺失的日期取指定时区的今天，缺失的时间取 0
  const now = getZonedParts(Date.now(), mode, offsetHours);
  let year = now.year;
  let month = now.month;
  let day = now.day;
  let hour = 0, minute = 0, second = 0, milli = 0;
  let hour12: number | null = null;
  let meridiem = '';
  let zoneMinutes: number | null = null;

  tokens.forEach((token, index) => {
    const value = matched[index + 1];
    switch (token[0]) {
      case 'y': year = token.length === 2 ? 2000 + Number(value) : Number(value); break;
      case 'M': month = Number(value); break;
      case 'd': day = Number(value); break;
      case 'H': hour = Number(value); break;
      case 'h': hour12 = Number(value); break;
      case 'm': minute = Number(value); break;
      case 's': second = Number(value); break;
      case 'S': milli = Number(value.padEnd(3, '0')); break;
      case 'a':
      case 'A': meridiem = value.toLowerCase(); break;
      case 'Z':
        zoneMinutes = value.toUpperCase() === 'Z'
          ? 0
          : (value[0] === '-' ? -1 : 1) * (Number(value.slice(1, 3)) * 60 + Number(value.replace(':', '').slice(3, 5)));
        break;
    }
  });

  // 3. 12 小时制换算（配合 am/pm；未写 am/pm 时按 0~23 理解）
  if (hour12 !== null) hour = meridiem ? (hour12 % 12) + (meridiem === 'pm' ? 12 : 0) : hour12;

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23
    || minute < 0 || minute > 59 || second < 0 || second > 59 || milli < 0 || milli > 999) return null;

  // 4. 生成时间戳：文本含 Z 时以其时区为准，否则使用页面选择的时区
  const parts = { year, month, day, hour, minute, second };
  if (zoneMinutes !== null) {
    const utc = new Date(0);
    utc.setUTCFullYear(year, month - 1, day);
    utc.setUTCHours(hour, minute, second, milli);
    const ms = utc.getTime() - zoneMinutes * 60e3;
    return sameZoneParts(ms, zoneMinutes, parts) && Math.abs(ms) <= 8.64e15 ? ms : null;
  }
  if (mode === 'local') {
    const local = new Date(0);
    local.setFullYear(year, month - 1, day);
    local.setHours(hour, minute, second, milli);
    const ms = local.getTime();
    return local.getFullYear() === year && local.getMonth() === month - 1 && local.getDate() === day
      && local.getHours() === hour && local.getMinutes() === minute && local.getSeconds() === second
      ? ms : null;
  }
  const zone = getZoneOffsetMinutes(mode, offsetHours);
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, day);
  utc.setUTCHours(hour, minute, second, milli);
  const ms = utc.getTime() - zone * 60e3;
  return sameZoneParts(ms, zone, parts) && Math.abs(ms) <= 8.64e15 ? ms : null;
}

/** 常用格式化预设（pattern 语法与 Date.prototype.format 一致） */
export const FORMAT_PRESETS: { key: string; label: string; pattern: string }[] = [
  { key: 'std', label: 'yyyy-MM-dd HH:mm:ss', pattern: 'yyyy-MM-dd HH:mm:ss' },
  { key: 'ms', label: 'yyyy-MM-dd HH:mm:ss.SSS', pattern: 'yyyy-MM-dd HH:mm:ss.SSS' },
  { key: 'iso', label: 'ISO 8601  yyyy-MM-ddTHH:mm:ss', pattern: 'yyyy-MM-ddTHH:mm:ss' },
  { key: 'date', label: '仅日期 yyyy-MM-dd', pattern: 'yyyy-MM-dd' },
  { key: 'time', label: '仅时间 HH:mm:ss', pattern: 'HH:mm:ss' },
  { key: 'slash', label: 'yyyy/MM/dd HH:mm', pattern: 'yyyy/MM/dd HH:mm' },
  { key: 'cn', label: '中文 yyyy年MM月dd日 HH:mm:ss', pattern: 'yyyy年MM月dd日 HH:mm:ss' },
  { key: 'week', label: '星期 EE yyyy-MM-dd HH:mm:ss', pattern: 'EE yyyy-MM-dd HH:mm:ss' },
  { key: 'ampm', label: '12 小时制 yyyy-MM-dd hh:mm:ss AP', pattern: 'yyyy-MM-dd hh:mm:ss AP' },
  { key: 'zone', label: '带时区 yyyy-MM-dd HH:mm:ss [GMT]Z', pattern: 'yyyy-MM-dd HH:mm:ss [GMT]Z' },
];

/**
 * 计算时间差描述（相对当前时间）
 * @param ms {number} 目标毫秒时间戳
 * @returns {{ diffMs: number, future: boolean, desc: string }} 差值信息
 */
export function describeDiff(ms: number): { diffMs: number; future: boolean; desc: string } {
  const diffMs = ms - Date.now();
  const future = diffMs >= 0;
  const abs = Math.abs(diffMs);
  const sec = Math.floor(abs / 1000);
  const units: [number, string][] = [
    [Math.floor(sec / 86400 / 365), '年'],
    [Math.floor(sec / 86400 / 30), '个月'],
    [Math.floor(sec / 86400), '天'],
    [Math.floor(sec / 3600) % 24, '小时'],
    [Math.floor(sec / 60) % 60, '分钟'],
    [sec % 60, '秒'],
  ];
  const picked = units.filter(([v]) => v > 0).slice(0, 2);
  const desc = picked.length
    ? picked.map(([v, n]) => `${v}${n}`).join('')
    : '不到1秒';
  return { diffMs, future, desc };
}
