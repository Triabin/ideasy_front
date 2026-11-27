/**
 * 年号查询核心逻辑。
 * 年号数据存放于 ./data/ 目录下的 JSON 文件（按朝代分组），字段约定：
 * - dynasty：朝代/政权名；emperors[].name：帝号与姓名；
 * - bc：为 true 时该皇帝所有年号年份均为公元前年份（数值为正数，表示「公元前 X 年」，无公元 0 年）；
 * - eras[].from / to：年号起讫年份（含两端）；
 * - fm / fd、tm / td：可选的起讫月日（缺省为 1 月 1 日与 12 月 31 日），用于有明确记载的改元/退位边界；
 * - yn：可选，结束公历年对应的年号年数（用于年号在农历岁首前终结等「公历年份差 ≠ 年号年数」的场景，
 *   如 1912 年 2 月退位时仍是宣统三年；0 表示不显示年数，如张勋复辟恢复宣统年号）；
 * - note：备注。
 * 精度说明：
 * 1. 绝大多数改元发生在农历正月初一，本数据仅对「有明确史料可考」的改元记录月/日，其余仍按「年」近似；
 * 2. 同朝代内下一年号的起始日精确到月/日时，会自动把上一年号的结束日截断到前一天；
 * 3. 1582 年 10 月之前欧洲通用儒略历，本工具统一按格里历（公历）处理，边界日期可能有数日出入；
 * 4. 数据整理自常见史表，割据政权与短命年号的起止年份诸家记载互有出入，仅供参考。
 */
import hanData from './data/han.json';
import sanguoJinData from './data/sanguo-jin.json';
import shiliuguoData from './data/shiliuguo.json';
import nanbeichaoData from './data/nanbeichao.json';
import suiTangData from './data/sui-tang.json';
import wudaiShiguoData from './data/wudai-shiguo.json';
import songLiaoJinXiaData from './data/song-liao-jin-xia.json';
import yuanMingQingData from './data/yuan-ming-qing.json';

/** JSON 数据中单个年号的结构 */
interface EraJson {
  name: string;
  from: number;
  to: number;
  /** 起始月（缺省 1） */
  fm?: number;
  /** 起始日（缺省 1） */
  fd?: number;
  /** 结束月（缺省 12） */
  tm?: number;
  /** 结束日（缺省 31） */
  td?: number;
  /** 结束公历年对应的年号年数（0 = 不显示年数），缺省按公历年份差推算 */
  yn?: number;
  note?: string;
}

/** JSON 数据中单个皇帝的结构 */
interface EmperorJson {
  name: string;
  /** 该皇帝年号均为公元前年份 */
  bc?: boolean;
  eras: EraJson[];
}

/** JSON 数据中单个朝代的结构 */
interface DynastyJson {
  dynasty: string;
  emperors: EmperorJson[];
}

/** 一个日期点（天文纪年：公元 1 年为 1，公元前 1 年为 0，公元前 2 年为 -1） */
interface DatePoint {
  y: number;
  m: number;
  d: number;
}

/** 展平后的年号记录 */
interface EraEntry {
  dynasty: string;
  emperor: string;
  name: string;
  note?: string;
  /** 结束公历年对应的年号年数（0 = 不显示年数） */
  yn?: number;
  /** 是否公元前纪年（用于展示） */
  bc: boolean;
  /** 起始年份（公元前后习惯纪年，公元前为正数） */
  from: number;
  to: number;
  start: DatePoint;
  end: DatePoint;
  /** 起始日期精度：0 仅年、1 精确到月、2 精确到日 */
  startPrecision: 0 | 1 | 2;
  /** 结束日期精度：0 仅年、1 精确到月、2 精确到日 */
  endPrecision: 0 | 1 | 2;
}

/** 查询结果中的单条匹配 */
export interface NianHaoMatch {
  dynasty: string;
  emperor: string;
  name: string;
  note?: string;
  /** 年号纪年展示文本，如「建元三年」 */
  eraText: string;
  /** 该日期所属的年号年数（1 表示元年） */
  yearInEra: number;
  /** 公元纪年展示文本，如「公元前 138 年」 */
  gongyuan: string;
  /** 年号起止展示文本，如「前 140 年 — 前 135 年」 */
  span: string;
}

/** 上一个/下一个年号的跳转目标 */
export interface EraJumpTarget {
  bc: boolean;
  /** 起始年份（习惯纪年，公元前为正数） */
  year: number;
  month: number;
  day: number;
  dynasty: string;
  emperor: string;
  name: string;
}

export type QueryStatus = 'ok' | 'before' | 'ended' | 'gap';

export interface QueryResult {
  status: QueryStatus;
  /** 每个政权一条主年号，第一条为查询日期对应的主年号，其余为同时并立的政权 */
  matches: NianHaoMatch[];
  /** 同年改元、具体月日不详时，同政权下年初可能仍在使用的旧年号 */
  alternatives: NianHaoMatch[];
  /** 干支纪年，仅天干地支两字，如「庚午」 */
  ganzhi: string;
}

/** 正统主要王朝，用于多政权并存时主年号的排序 */
const MAJOR_DYNASTIES = new Set([
  '西汉', '新朝', '玄汉', '东汉', '曹魏', '蜀汉', '孙吴', '西晋', '东晋',
  '隋', '唐', '武周', '后梁', '后唐', '后晋', '后汉', '后周',
  '北宋', '南宋', '元', '明', '清'
]);

/** 年号纪年起点：汉武帝建元元年（公元前 140 年）正月初一 */
const EARLIEST: DatePoint = { y: -139, m: 1, d: 1 };
/** 年号纪年法理终点：1912 年 2 月 12 日宣统帝退位 */
const NIANHAO_END: DatePoint = { y: 1912, m: 2, d: 12 };

/** 习惯纪年转天文纪年（公元前 X 年 → -(X-1)） */
function toAstro(bc: boolean, year: number): number {
  return bc ? 1 - year : year;
}

/** 天文纪年转展示文本 */
function formatGongyuan(bc: boolean, year: number): string {
  return bc ? `公元前 ${year} 年` : `公元 ${year} 年`;
}

/** 比较两个日期点：a < b 返回 -1，相等返回 0，a > b 返回 1 */
function cmpDate(a: DatePoint, b: DatePoint): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  return 0;
}

/** 指定公历年的某月天数（按格里历闰年规则） */
function daysInMonth(year: number, month: number): number {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** 前一天的日期点 */
function dayBefore(point: DatePoint): DatePoint {
  if (point.d > 1) return { y: point.y, m: point.m, d: point.d - 1 };
  if (point.m > 1) return { y: point.y, m: point.m - 1, d: daysInMonth(point.y, point.m - 1) };
  return { y: point.y - 1, m: 12, d: 31 };
}

/** 天干 */
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
/** 地支 */
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 由天文纪年推算干支纪年（公元 4 年为甲子年） */
function ganzhiOf(astroYear: number): string {
  const gan = ((astroYear - 4) % 10 + 10) % 10;
  const zhi = ((astroYear - 4) % 12 + 12) % 12;
  return `${TIAN_GAN[gan]}${DI_ZHI[zhi]}`;
}

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 数字转中文（支持 1-99，用于「XX年」展示） */
function chineseNumeral(n: number): string {
  if (n === 10) return '十';
  if (n < 10) return CN_DIGITS[n];
  if (n < 20) return `十${CN_DIGITS[n % 10]}`;
  if (n < 100) return `${CN_DIGITS[Math.floor(n / 10)]}十${n % 10 ? CN_DIGITS[n % 10] : ''}`;
  return String(n);
}

/** 年号年数展示文本：1 → 元年，2 → 二年 …… */
function eraYearText(name: string, yearInEra: number): string {
  return yearInEra === 1 ? `${name}元年` : `${name}${chineseNumeral(yearInEra)}年`;
}

/** 起止日期展示文本，有精确月/日时一并显示 */
function formatSpan(entry: EraEntry): string {
  const fmt = (year: number, point: DatePoint, precision: 0 | 1 | 2): string => {
    const y = entry.bc ? `前 ${year}` : `${year}`;
    if (precision === 0) return `${y} 年`;
    if (precision === 1) return `${y} 年 ${point.m} 月`;
    return `${y} 年 ${point.m} 月 ${point.d} 日`;
  };
  return `${fmt(entry.from, entry.start, entry.startPrecision)} — ${fmt(entry.to, entry.end, entry.endPrecision)}`;
}

/**
 * 同朝代内下一年号起始日精确到月/日时，把上一年号的结束日截断到前一天。
 * 例如崇德元年（1636 年 5 月 15 日）建立后，天聪年号应在此前一日结束。
 */
function resolveBoundaries(entries: EraEntry[]): void {
  const precise = entries.filter(e => e.startPrecision > 0);
  for (const next of precise) {
    for (const prev of entries) {
      if (prev === next || prev.dynasty !== next.dynasty) continue;
      // 仅处理起始更早、且在同一公历年内与新年号重叠的旧年号
      if (cmpDate(prev.start, next.start) >= 0) continue;
      if (prev.end.y !== next.start.y) continue;
      if (cmpDate(prev.end, next.start) < 0) continue;
      const lastDay = dayBefore(next.start);
      if (cmpDate(lastDay, prev.end) < 0) {
        prev.end = lastDay;
        prev.endPrecision = 2;
      }
    }
  }
}

/** 展平所有 JSON 数据为年号记录列表（保持文件与朝代顺序） */
function buildEntries(): EraEntry[] {
  const groups = [
    hanData, sanguoJinData, shiliuguoData, nanbeichaoData,
    suiTangData, wudaiShiguoData, songLiaoJinXiaData, yuanMingQingData
  ] as DynastyJson[][];
  const entries: EraEntry[] = [];
  for (const group of groups) {
    for (const dynasty of group) {
      for (const emperor of dynasty.emperors) {
        const bc = !!emperor.bc;
        for (const era of emperor.eras) {
          entries.push({
            dynasty: dynasty.dynasty,
            emperor: emperor.name,
            name: era.name,
            note: era.note,
            yn: era.yn,
            bc,
            from: era.from,
            to: era.to,
            start: { y: toAstro(bc, era.from), m: era.fm ?? 1, d: era.fd ?? 1 },
            end: { y: toAstro(bc, era.to), m: era.tm ?? 12, d: era.td ?? 31 },
            startPrecision: era.fd !== undefined ? 2 : era.fm !== undefined ? 1 : 0,
            endPrecision: era.td !== undefined ? 2 : era.tm !== undefined ? 1 : 0
          });
        }
      }
    }
  }
  resolveBoundaries(entries);
  return entries;
}

/** 全部年号记录（约数百条，启动时展平一次） */
export const ERA_ENTRIES: EraEntry[] = buildEntries();

/**
 * 沿年号时间轴查找离给定日期最近的一个年号起始日
 * @param dir -1 表示向前找（起始日早于给定日期的最近一个），1 表示向后找
 */
export function findEraStart(bc: boolean, year: number, month: number, day: number, dir: -1 | 1): EraJumpTarget | undefined {
  const point: DatePoint = { y: toAstro(bc, year), m: month, d: day };
  let best: EraEntry | undefined;
  for (const e of ERA_ENTRIES) {
    const toPoint = cmpDate(e.start, point);
    // 只保留指定方向上（严格早于/晚于给定日期）的候选
    if (dir === -1 ? toPoint >= 0 : toPoint <= 0) continue;
    if (!best) {
      best = e;
      continue;
    }
    const toBest = cmpDate(e.start, best.start);
    // 取方向上最接近的一个；起始日相同时优先主要王朝
    if ((dir === -1 ? toBest > 0 : toBest < 0)
      || (toBest === 0 && MAJOR_DYNASTIES.has(e.dynasty) && !MAJOR_DYNASTIES.has(best.dynasty))) {
      best = e;
    }
  }
  if (!best) return undefined;
  return {
    bc: best.start.y <= 0,
    year: best.from,
    month: best.start.m,
    day: best.start.d,
    dynasty: best.dynasty,
    emperor: best.emperor,
    name: best.name
  };
}

/** 数据覆盖的时间范围（用于页面展示） */
export const COVERAGE = {
  startText: '汉武帝建元元年（公元前 140 年）',
  endText: '清宣统三年（1912 年 2 月 12 日退位）',
  total: ERA_ENTRIES.length
};

/** 把年号记录转换为查询结果 */
function toMatch(entry: EraEntry, bc: boolean, year: number, astroYear: number): NianHaoMatch {
  // 年号年数：默认按公历年份差推算；结束年若指定 yn 则以 yn 为准（0 表示不显示年数）
  const useOverride = entry.yn !== undefined && astroYear === entry.end.y;
  const yearInEra = useOverride ? (entry.yn as number) : astroYear - entry.start.y + 1;
  return {
    dynasty: entry.dynasty,
    emperor: entry.emperor,
    name: entry.name,
    note: entry.note,
    eraText: yearInEra > 0 ? eraYearText(entry.name, yearInEra) : entry.name,
    yearInEra,
    gongyuan: formatGongyuan(bc, year),
    span: formatSpan(entry)
  };
}

/**
 * 查询某个公历日期对应的年号与皇帝
 * @param bc 是否公元前
 * @param year 年份（公元前时为正数，如公元前 140 年传 140）
 * @param month 月份 1-12
 * @param day 日 1-31
 */
export function queryNianHao(bc: boolean, year: number, month: number, day: number): QueryResult {
  const ay = toAstro(bc, year);
  const point: DatePoint = { y: ay, m: month, d: day };
  const ganzhi = ganzhiOf(ay);

  const matched = ERA_ENTRIES.filter(e => cmpDate(e.start, point) <= 0 && cmpDate(point, e.end) <= 0);
  if (matched.length > 0) {
    // 同一政权在改元之年可能命中两个年号：以起始较晚的为当年主年号，其余作为「年初旧年号」
    const byDynasty = new Map<string, EraEntry[]>();
    for (const entry of matched) {
      const list = byDynasty.get(entry.dynasty);
      if (list) list.push(entry);
      else byDynasty.set(entry.dynasty, [entry]);
    }
    const primaries: EraEntry[] = [];
    const alternatives: EraEntry[] = [];
    byDynasty.forEach(list => {
      list.sort((a, b) => cmpDate(a.start, b.start));
      primaries.push(list[list.length - 1]);
      alternatives.push(...list.slice(0, -1));
    });
    // 主要王朝优先，其次按起始时间排列
    primaries.sort((a, b) => {
      const majorDiff = Number(MAJOR_DYNASTIES.has(b.dynasty)) - Number(MAJOR_DYNASTIES.has(a.dynasty));
      return majorDiff !== 0 ? majorDiff : cmpDate(a.start, b.start);
    });
    alternatives.sort((a, b) => cmpDate(a.start, b.start));
    return {
      status: 'ok',
      matches: primaries.map(e => toMatch(e, bc, year, ay)),
      alternatives: alternatives.map(e => toMatch(e, bc, year, ay)),
      ganzhi
    };
  }
  if (cmpDate(point, EARLIEST) < 0) {
    return { status: 'before', matches: [], alternatives: [], ganzhi };
  }
  if (cmpDate(point, NIANHAO_END) > 0) {
    return { status: 'ended', matches: [], alternatives: [], ganzhi };
  }
  return { status: 'gap', matches: [], alternatives: [], ganzhi };
}
