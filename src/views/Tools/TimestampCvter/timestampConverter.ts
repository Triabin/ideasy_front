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

/** 可格式化的日期片段（供自定义模板替换） */
export interface DateParts {
  yyyy: string; // 四位年份
  MM: string;   // 两位月份
  dd: string;   // 两位日期
  HH: string;   // 两位小时（24制）
  mm: string;   // 两位分钟
  ss: string;   // 两位秒
  SSS: string;  // 三位毫秒
}

const pad = (n: number, len = 2): string => String(Math.abs(n)).padStart(len, '0');

/**
 * 获取当前时间的毫秒级时间戳
 */
export const nowMs = (): number => Date.now();

/**
 * 判断输入字符串是否为纯数字时间戳（可带负号）
 */
export function isNumericTimestamp(s: string): boolean {
  return /^-?\d+$/.test(s.trim());
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
 * 将日期时间字符串解析为毫秒时间戳（依赖浏览器对常见格式的解析）
 * @param text {string} 日期时间字符串，如 "2026-10-19 12:00:00"
 * @param mode {TimeZoneMode} 时区模式
 * @param offsetHours {number} mode 为 offset 时的 UTC 偏移小时数
 * @returns {number | null} 毫秒时间戳，无法解析返回 null
 */
export function parseDateTimeToMs(
  text: string,
  mode: TimeZoneMode = 'local',
  offsetHours: number = 0
): number | null {
  const raw = text.trim();
  if (!raw) return null;
  // 纯数字视为时间戳而非日期字符串
  if (isNumericTimestamp(raw)) return null;
  let ms: number | null = null;
  if (mode === 'utc') {
    // 按 UTC 解析：无时区信息时补 Z
    const normalized = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`;
    const t = Date.parse(normalized);
    ms = Number.isNaN(t) ? null : t;
  } else if (mode === 'offset') {
    const normalized = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`;
    const t = Date.parse(normalized);
    ms = Number.isNaN(t) ? null : t - offsetHours * 3600e3;
  } else {
    const normalized = raw.replace(/\.(\d{1,3})$/, (_m, g: string) => '.' + g.padEnd(3, '0'));
    const t = Date.parse(normalized);
    ms = Number.isNaN(t) ? null : t;
  }
  if (ms === null) return null;
  return Math.abs(ms) <= 8.64e15 ? ms : null;
}

/**
 * 在指定时区下拆分毫秒时间戳为日期片段
 * @param ms {number} 毫秒时间戳
 * @param mode {TimeZoneMode} 时区模式
 * @param offsetHours {number} mode 为 offset 时的 UTC 偏移小时数
 * @returns {DateParts} 日期片段
 */
export function getDateParts(ms: number, mode: TimeZoneMode, offsetHours: number): DateParts {
  const d = new Date(ms);
  let yyyy: number, MM: number, dd: number, HH: number, mm: number, ss: number, SSS: number;
  if (mode === 'local') {
    yyyy = d.getFullYear();
    MM = d.getMonth() + 1;
    dd = d.getDate();
    HH = d.getHours();
    mm = d.getMinutes();
    ss = d.getSeconds();
    SSS = d.getMilliseconds();
  } else {
    const shift = mode === 'utc' ? 0 : offsetHours * 3600e3;
    const s = new Date(ms + shift);
    yyyy = s.getUTCFullYear();
    MM = s.getUTCMonth() + 1;
    dd = s.getUTCDate();
    HH = s.getUTCHours();
    mm = s.getUTCMinutes();
    ss = s.getUTCSeconds();
    SSS = s.getUTCMilliseconds();
  }
  return {
    yyyy: (yyyy < 0 ? '-' : '') + pad(yyyy, 4),
    MM: pad(MM), dd: pad(dd), HH: pad(HH), mm: pad(mm), ss: pad(ss), SSS: pad(SSS, 3),
  };
}

/**
 * 获取时区后缀标识，如 " UTC"、" GMT+8"
 */
export function getTimeZoneLabel(mode: TimeZoneMode, offsetHours: number): string {
  if (mode === 'utc') return ' UTC';
  if (mode === 'offset') {
    const sign = offsetHours >= 0 ? '+' : '-';
    const h = Math.abs(offsetHours);
    const hh = Math.floor(h);
    const mmm = Math.round((h - hh) * 60);
    return ` GMT${sign}${hh}${mmm ? ':' + pad(mmm) : ''}`;
  }
  return '';
}

/** 常用格式化预设 */
export const FORMAT_PRESETS: { key: string; label: string; template: string }[] = [
  { key: 'std', label: 'YYYY-MM-DD HH:mm:ss', template: '{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}' },
  { key: 'ms', label: 'YYYY-MM-DD HH:mm:ss.SSS', template: '{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}.{SSS}' },
  { key: 'iso', label: 'ISO 8601', template: '{yyyy}-{MM}-{dd}T{HH}:{mm}:{ss}' },
  { key: 'date', label: '仅日期 YYYY-MM-DD', template: '{yyyy}-{MM}-{dd}' },
  { key: 'time', label: '仅时间 HH:mm:ss', template: '{HH}:{mm}:{ss}' },
  { key: 'slash', label: 'YYYY/MM/DD HH:mm', template: '{yyyy}/{MM}/{dd} {HH}:{mm}' },
  { key: 'cn', label: '中文 YYYY年MM月DD日', template: '{yyyy}年{MM}月{dd}日 {HH}:{mm}:{ss}' },
];

/**
 * 按模板格式化时间（模板中使用 {yyyy} {MM} {dd} {HH} {mm} {ss} {SSS} 占位符）
 * @param ms {number} 毫秒时间戳
 * @param template {string} 格式模板
 * @param mode {TimeZoneMode} 时区模式
 * @param offsetHours {number} 偏移小时数
 */
export function formatByTemplate(
  ms: number,
  template: string,
  mode: TimeZoneMode,
  offsetHours: number
): string {
  const parts = getDateParts(ms, mode, offsetHours);
  return template.replace(/\{(yyyy|MM|dd|HH|mm|ss|SSS)}/g, (_m, k: keyof DateParts) => parts[k]);
}

/**
 * 获取星期名称
 */
export function getWeekdayName(ms: number, mode: TimeZoneMode, offsetHours: number): string {
  const parts = getDateParts(ms, mode, offsetHours);
  const day = new Date(`${parts.yyyy}-${parts.MM}-${parts.dd}T00:00:00Z`).getUTCDay();
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day] ?? '';
}

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
