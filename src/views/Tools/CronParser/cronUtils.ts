/**
 * Cron 表达式解析引擎（纯前端，无服务端依赖）
 * 支持格式：
 * ① 标准 5 位 Crontab：分 时 日 月 周（周 0-7，0 与 7 均表示周日，Vixie Cron 约定）
 * ② Quartz/Spring 6 位：秒 分 时 日 月 周
 * ③ Quartz 7 位：秒 分 时 日 月 周 年
 * ④ 预定义别名：@yearly @monthly @weekly @daily @hourly @reboot 等
 * 支持特殊字符：* , - / ? L W #（L/W/# 为 Quartz 扩展，标准 Crontab 不支持）
 * 星期数字存在两种约定（unix：0=周日；quartz：1=周日），6 位表达式可通过 dialectPref 切换。
 * 整体中文描述由 cronstrue（zh_CN 语言包）生成，Quartz 数字星期会先归一化再传入。
 */
import cronstrue from 'cronstrue';
import 'cronstrue/locales/zh_CN';

/** 星期数字约定：unix=0-7（0/7 均为周日，标准 Crontab / Spring）；quartz=1-7（1=周日，Quartz / xxl-job） */
export type CronDialect = 'unix' | 'quartz';
/** 字段键 */
export type FieldKey = 'second' | 'minute' | 'hour' | 'dom' | 'month' | 'dow' | 'year';

/** 单个字段的解析展示信息 */
export interface CronFieldInfo {
  key: FieldKey;
  /** 字段名（秒/分/时/日/月/周/年） */
  label: string;
  /** 原始输入 */
  raw: string;
  /** 中文含义 */
  desc: string;
  /** 允许范围说明 */
  range: string;
  /** 徽标样式类名（必须写全类名，否则构建时不会被打进样式包） */
  cls: string;
  /** 字段错误信息 */
  error?: string;
}

/** 完整解析结果 */
export interface CronParseResult {
  ok: boolean;
  input: string;
  /** 实际采用的星期数字约定 */
  dialect: CronDialect;
  /** 约定是否由位数强制确定（5 位强制 unix、7 位强制 quartz，不可切换） */
  dialectForced: boolean;
  /** 是否含秒字段（6/7 位） */
  hasSeconds: boolean;
  /** 是否含年字段（7 位） */
  hasYear: boolean;
  /** 预定义别名信息 */
  alias?: { name: string; expanded?: string };
  /** 无固定触发时间（如 @reboot） */
  noFire?: boolean;
  /** 字段分解（按展示顺序） */
  fields: CronFieldInfo[];
  /** 整体中文描述 */
  description?: string;
  /** 语义警告（不影响解析） */
  warnings: string[];
  /** 整体错误信息 */
  error?: string;
  /** 出错字段 */
  errorField?: FieldKey;
  /** 后续触发时间 */
  nextTimes: Date[];
  /** 是否因搜索到年限上限而未能凑满 nextTimes */
  exhausted?: boolean;
}

/** 日字段特殊语法 */
interface DomSpecial {
  type: 'L' | 'LW' | 'W';
  /** L-n：距月底天数 */
  offset?: number;
  /** nW：目标日 */
  day?: number;
}

/** 周字段特殊语法（dow 已归一化为 0-6，0=周日） */
interface DowSpecial {
  type: 'L' | 'hash';
  dow: number;
  /** n#m 中的 m（第几个） */
  nth?: number;
}

/** 单字段匹配信息 */
interface FieldMatcher {
  /** 是否为 * 或 ?（任意值） */
  wild: boolean;
  /** 是否为 ?（不指定，仅日/周字段） */
  question: boolean;
  /** 显式数值集合（dow 已归一化为 0-6） */
  values: Set<number>;
  domSpecials: DomSpecial[];
  dowSpecials: DowSpecial[];
}

/** 用于推算下次执行时间的引擎 */
interface CronEngine {
  hasSeconds: boolean;
  dialect: CronDialect;
  secSet: Set<number>;
  minSet: Set<number>;
  hourSet: Set<number>;
  monthSet: Set<number>;
  /** 年集合，null 表示不限 */
  yearSet: Set<number> | null;
  domMatcher: FieldMatcher;
  dowMatcher: FieldMatcher;
  /** 按 年*100+月 缓存的当月可触发日集合 */
  dayCache: Map<number, Set<number>>;
}

/** 字段静态元信息 */
const FIELD_META: Record<FieldKey, { label: string; min: number; max: number; cls: string }> = {
  second: { label: '秒', min: 0, max: 59, cls: 'badge-soft badge-info' },
  minute: { label: '分', min: 0, max: 59, cls: 'badge-soft badge-primary' },
  hour: { label: '时', min: 0, max: 23, cls: 'badge-soft badge-secondary' },
  dom: { label: '日', min: 1, max: 31, cls: 'badge-soft badge-success' },
  month: { label: '月', min: 1, max: 12, cls: 'badge-soft badge-warning' },
  dow: { label: '周', min: 0, max: 7, cls: 'badge-soft badge-error' },
  year: { label: '年', min: 1970, max: 2099, cls: 'badge-soft badge-neutral' },
};

const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};
const DOW_NAMES: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const DOW_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MONTH_ZH = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/** 预定义别名（统一展开为标准 5 位） */
const ALIASES: Record<string, string> = {
  '@YEARLY': '0 0 1 1 *',
  '@ANNUALLY': '0 0 1 1 *',
  '@MONTHLY': '0 0 1 * *',
  '@WEEKLY': '0 0 * * 0',
  '@DAILY': '0 0 * * *',
  '@MIDNIGHT': '0 0 * * *',
  '@HOURLY': '0 * * * *',
};

/** 下次触发时间搜索的年份上限 */
const MAX_YEAR = 2099;
/** 搜索循环保护上限（防死循环） */
const GUARD_MAX = 50000;

/** 字段取值范围（周字段随约定变化） */
function fieldRange(key: FieldKey, dialect: CronDialect): { min: number; max: number } {
  if (key === 'dow') return dialect === 'quartz' ? { min: 1, max: 7 } : { min: 0, max: 7 };
  return { min: FIELD_META[key].min, max: FIELD_META[key].max };
}

/** 解析单个取值记号（数字或名称）；dow 归一化为 0-6（0=周日）。非法返回 null */
function resolveValue(key: FieldKey, tok: string, dialect: CronDialect): number | null {
  const { min, max } = fieldRange(key, dialect);
  if (/^\d+$/.test(tok)) {
    const n = parseInt(tok, 10);
    if (n < min || n > max) return null;
    if (key === 'dow') return dialect === 'quartz' ? n - 1 : n === 7 ? 0 : n;
    return n;
  }
  const upper = tok.toUpperCase();
  if (key === 'month' && MONTH_NAMES[upper] !== undefined) return MONTH_NAMES[upper];
  if (key === 'dow' && DOW_NAMES[upper] !== undefined) return DOW_NAMES[upper];
  return null;
}

/** 单值格式化（dow 传入已归一化的 0-6） */
function fmtVal(key: FieldKey, v: number): string {
  switch (key) {
    case 'second': return `${v}秒`;
    case 'minute': return `${v}分`;
    case 'hour': return `${v}点`;
    case 'dom': return `${v}号`;
    case 'month': return MONTH_ZH[v] ?? `${v}月`;
    case 'dow': return DOW_ZH[v] ?? `周${v}`;
    case 'year': return `${v}年`;
  }
}

/** 步长的单位词 */
function stepUnit(key: FieldKey): string {
  switch (key) {
    case 'second': return '秒';
    case 'minute': return '分钟';
    case 'hour': return '小时';
    case 'dom': case 'dow': return '天';
    case 'month': return '个月';
    case 'year': return '年';
  }
}

/** 任意值的含义（*） */
function everyUnit(key: FieldKey): string {
  switch (key) {
    case 'second': return '每秒';
    case 'minute': return '每分钟';
    case 'hour': return '每小时';
    case 'dom': case 'dow': return '每天';
    case 'month': return '每月';
    case 'year': return '每年';
  }
}

/** 取值非法时的错误信息 */
function valError(key: FieldKey, tok: string, dialect: CronDialect): string {
  const label = FIELD_META[key].label;
  const { min, max } = fieldRange(key, dialect);
  if (key === 'dow') {
    if (dialect === 'quartz' && tok === '0') {
      return '周字段：Quartz 约定数字取值为 1-7（1=周日），不支持 0；如你的平台使用 0=周日 约定（如 Spring），请切换到“标准/Spring”星期约定';
    }
    return dialect === 'quartz'
      ? `周字段无法识别“${tok}”，应为 1-7 的数字或 SUN-SAT 名称（1=周日）`
      : `周字段无法识别“${tok}”，应为 0-7 的数字或 SUN-SAT 名称（0 和 7 都表示周日）`;
  }
  if (/^\d+$/.test(tok)) return `${label}字段“${tok}”超出允许范围 ${min}-${max}`;
  if (key === 'month') return `${label}字段无法识别“${tok}”，应为 ${min}-${max} 的数字或 JAN-DEC 名称`;
  return `${label}字段无法识别“${tok}”，应为 ${min}-${max} 的数字`;
}

/** 字段允许范围的展示文案 */
function rangeTip(key: FieldKey, dialect: CronDialect): string {
  switch (key) {
    case 'second': case 'minute': return '0-59';
    case 'hour': return '0-23';
    case 'dom': return '1-31，支持 L、W';
    case 'month': return '1-12 或 JAN-DEC';
    case 'dow': return dialect === 'quartz'
      ? '1-7 或 SUN-SAT（1=周日），支持 L、#'
      : '0-7 或 SUN-SAT（0/7=周日），支持 L、#';
    case 'year': return '1970-2099';
  }
}

/** 解析字段中的一个逗号分项 */
function parsePart(key: FieldKey, part: string, dialect: CronDialect, m: FieldMatcher): { desc?: string; error?: string } {
  const label = FIELD_META[key].label;
  const upper = part.toUpperCase();
  const { min, max } = fieldRange(key, dialect);

  // 1. * 任意值
  if (upper === '*') {
    m.wild = true;
    return { desc: everyUnit(key) };
  }

  // 1.1 ? 仅日/周字段可用，含义同 *（不指定具体值）
  if (upper === '?') {
    if (key !== 'dom' && key !== 'dow') return { error: `${label}字段不支持“?”，“?”只能用在日和周字段` };
    m.wild = true;
    m.question = true;
    return { desc: '不指定（任意值）' };
  }

  // 2. 日字段特殊语法：L、L-n、LW、nW
  if (key === 'dom') {
    if (upper === 'L') { m.domSpecials.push({ type: 'L' }); return { desc: '每月最后一天' }; }
    const lOff = upper.match(/^L-(\d{1,2})$/);
    if (lOff) {
      const off = parseInt(lOff[1], 10);
      if (off > 30) return { error: `日字段“L-${off}”偏移不能超过 30 天` };
      m.domSpecials.push({ type: 'L', offset: off });
      return { desc: `每月最后一天前 ${off} 天` };
    }
    if (upper === 'LW') { m.domSpecials.push({ type: 'LW' }); return { desc: '每月最后一个工作日' }; }
    const wMatch = upper.match(/^(\d{1,2})W$/);
    if (wMatch) {
      const day = parseInt(wMatch[1], 10);
      if (day < 1 || day > 31) return { error: `日字段“${day}W”超出范围 1-31` };
      m.domSpecials.push({ type: 'W', day });
      return { desc: `每月最接近 ${day} 号的工作日` };
    }
    if (/[LW]/.test(upper)) return { error: `日字段“${part}”的 L/W 用法不合法（支持 L、L-n、LW、nW）` };
  }

  // 3. 周字段特殊语法：L（=周六）、nL、NAMEL、n#m、NAME#m
  if (key === 'dow') {
    if (upper === 'L') { m.dowSpecials.push({ type: 'L', dow: 6 }); return { desc: '每月最后一个周六' }; }
    const lMatch = upper.match(/^([A-Z]{3}|\d)L$/);
    if (lMatch) {
      const v = resolveValue(key, lMatch[1], dialect);
      if (v === null) return { error: valError(key, lMatch[1], dialect) };
      m.dowSpecials.push({ type: 'L', dow: v });
      return { desc: `每月最后一个${DOW_ZH[v]}` };
    }
    const hashMatch = upper.match(/^([A-Z]{3}|\d)#(\d)$/);
    if (hashMatch) {
      const v = resolveValue(key, hashMatch[1], dialect);
      if (v === null) return { error: valError(key, hashMatch[1], dialect) };
      const nth = parseInt(hashMatch[2], 10);
      if (nth < 1 || nth > 5) return { error: `周字段“#${nth}”只能表示第 1-5 个` };
      m.dowSpecials.push({ type: 'hash', dow: v, nth });
      return { desc: `每月第 ${nth} 个${DOW_ZH[v]}` };
    }
    if (/[L#]/.test(upper)) return { error: `周字段“${part}”的 L/# 用法不合法（支持 nL、n#m，如 6L、MON#2）` };
  }

  // 4. 特殊字符越界检查（?、L、W、# 仅限日/周字段，且 # 仅周、W 仅日）
  //    按 - 与 / 拆分后的单个记号判断：月份名 JUL、范围 JAN-JUL 都含字母 L，不能误判为特殊字符
  if (/[?LW#]/.test(upper)) {
    const suspicious = upper.split(/[-/]/).some(tok => /[?LW#]/.test(tok) && resolveValue(key, tok, dialect) === null);
    if (suspicious) {
      if (key === 'dom' && /#/.test(upper)) {
        return { error: `日字段“${part}”不支持“#”，“#”只能用在周字段（如 MON#2 表示每月第 2 个周一）` };
      }
      if (key === 'dow' && /W/.test(upper)) {
        return { error: `周字段“${part}”不支持“W”，“W”只能用在日字段（如 15W 表示最接近 15 号的工作日）` };
      }
      return { error: `${label}字段“${part}”包含不支持的特殊字符（?、L、W、# 只能用在日或周字段）` };
    }
  }

  // 5. * 与 步长 base/step
  const slash = part.split('/');
  if (slash.length > 2) return { error: `${label}字段“${part}”包含多个“/”` };
  const base = slash[0].toUpperCase();
  let step = 1;
  let stepGiven = false;
  if (slash.length === 2) {
    if (!/^\d+$/.test(slash[1])) return { error: `${label}字段步长“${slash[1]}”必须是正整数` };
    step = parseInt(slash[1], 10);
    if (step < 1) return { error: `${label}字段步长不能为 0` };
    stepGiven = true;
  }

  // dow 归一化后取值域为 0-6；其余字段用 meta 范围
  const normMin = key === 'dow' ? 0 : min;
  const normMax = key === 'dow' ? 6 : max;
  /** 向集合添加 [a,b] 内步长为 st 的值（支持回绕区间，如 FRI-MON、22-2 点） */
  const addSpan = (a: number, b: number, st: number) => {
    if (a <= b) {
      for (let v = a; v <= b; v += st) m.values.add(v);
    } else {
      for (let v = a; v <= normMax; v += st) m.values.add(v);
      for (let v = normMin; v <= b; v += st) m.values.add(v);
    }
  };

  // 5.1 */n：全范围步进（dow 在归一化空间 0-6 上步进，两种约定结果一致）
  if (base === '*') {
    // 不带步长的 * 已在前面处理，走到这里必然有步长
    addSpan(normMin, normMax, step);
    return { desc: `每 ${step} ${stepUnit(key)}` };
  }

  // 5.2 a-b（区间）或 a（单值）
  const range = base.split('-');
  if (range.length > 2) return { error: `${label}字段“${part}”格式不合法` };
  const a = resolveValue(key, range[0], dialect);
  if (a === null) return { error: valError(key, range[0], dialect) };
  if (range.length === 2) {
    const b = resolveValue(key, range[1], dialect);
    if (b === null) return { error: valError(key, range[1], dialect) };
    // 标准约定下 0-7 表示整周（0 与 7 均为周日，归一化后会坍缩成单点，需单独展开）
    if (key === 'dow' && dialect === 'unix' && range[0] === '0' && range[1] === '7') {
      addSpan(0, 6, step);
      return { desc: stepGiven ? `每天，每 ${step} 天` : '每天（0 与 7 均为周日，等价于 *）' };
    }
    addSpan(a, b, step);
    const span = `${fmtVal(key, a)}至${fmtVal(key, b)}${a > b ? '（跨边界回绕）' : ''}`;
    return { desc: stepGiven ? `${span}，每 ${step} ${stepUnit(key)}` : span };
  }
  if (stepGiven) {
    addSpan(a, normMax, step);
    return { desc: `从${fmtVal(key, a)}开始，每 ${step} ${stepUnit(key)}` };
  }
  m.values.add(a);
  return { desc: fmtVal(key, a) };
}

/** 解析单个字段 */
function parseField(key: FieldKey, raw: string, dialect: CronDialect): { matcher?: FieldMatcher; desc?: string; error?: string } {
  const label = FIELD_META[key].label;
  if (!raw) return { error: `${label}字段不能为空` };
  const matcher: FieldMatcher = { wild: false, question: false, values: new Set(), domSpecials: [], dowSpecials: [] };
  const descs: string[] = [];
  for (const part of raw.split(',')) {
    if (!part) return { error: `${label}字段存在空项（检查是否有多余的逗号）` };
    const r = parsePart(key, part, dialect, matcher);
    if (r.error) return { error: r.error };
    descs.push(r.desc!);
  }
  // 非 * / ? 且无显式取值与特殊语法时（理论上不可达，防御）
  if (!matcher.wild && matcher.values.size === 0 && matcher.domSpecials.length === 0 && matcher.dowSpecials.length === 0) {
    return { error: `${label}字段“${raw}”没有匹配任何取值` };
  }
  return { matcher, desc: descs.join('、') };
}

/** 将 Quartz 约定的数字星期（1=周日）归一化为 cronstrue 使用的 0=周日 约定 */
function remapDowForStrue(dowRaw: string): string {
  const dec = (s: string) => (/^\d+$/.test(s) ? String(parseInt(s, 10) - 1) : s);
  const remapToken = (tok: string): string => {
    let t = tok;
    t = t.replace(/^(\d)L$/, (_, d) => `${dec(d)}L`);
    t = t.replace(/^(\d)#(\d)$/, (_, d, n) => `${dec(d)}#${n}`);
    t = t.replace(/^(\d)-(\d)$/, (_, x, y) => `${dec(x)}-${dec(y)}`);
    t = t.replace(/^(\d)$/, (_, d) => dec(d));
    return t;
  };
  return dowRaw.split(',').map(part => {
    const si = part.indexOf('/');
    const base = si >= 0 ? part.slice(0, si) : part;
    const step = si >= 0 ? part.slice(si) : '';
    return remapToken(base) + step;
  }).join(',');
}

/** 生成整体中文描述（cronstrue 失败时返回 undefined，由调用方兜底） */
function describe(tokens: string[], keys: FieldKey[], dialect: CronDialect): string | undefined {
  try {
    const normalized = tokens.map((t, i) => (dialect === 'quartz' && keys[i] === 'dow' ? remapDowForStrue(t) : t));
    return cronstrue.toString(normalized.join(' '), { locale: 'zh_CN', use24HourTimeFormat: true });
  } catch {
    return undefined;
  }
}

const intersect = (a: Set<number>, b: Set<number>): Set<number> => new Set([...a].filter(v => b.has(v)));
const union = (a: Set<number>, b: Set<number>): Set<number> => new Set([...a, ...b]);

function buildEngine(matchers: Map<FieldKey, FieldMatcher>, dialect: CronDialect, hasSeconds: boolean, hasYear: boolean): CronEngine {
  const simple = (key: FieldKey): Set<number> => {
    const m = matchers.get(key)!;
    if (m.wild) {
      const { min, max } = fieldRange(key, dialect);
      const s = new Set<number>();
      for (let v = min; v <= max; v++) s.add(v);
      return s;
    }
    return m.values;
  };
  const yearM = hasYear ? matchers.get('year')! : null;
  return {
    hasSeconds,
    dialect,
    secSet: hasSeconds ? simple('second') : new Set([0]),
    minSet: simple('minute'),
    hourSet: simple('hour'),
    monthSet: simple('month'),
    yearSet: yearM && !yearM.wild ? yearM.values : null,
    domMatcher: matchers.get('dom')!,
    dowMatcher: matchers.get('dow')!,
    dayCache: new Map(),
  };
}

/** 计算某年某月所有可触发的“日”（含 L/W/# 语义与日、周字段的组合规则） */
function daySetFor(eng: CronEngine, y: number, mo: number): Set<number> {
  const cacheKey = y * 100 + mo;
  const cached = eng.dayCache.get(cacheKey);
  if (cached) return cached;
  const last = new Date(y, mo, 0).getDate();
  const allDays = (): Set<number> => {
    const s = new Set<number>();
    for (let d = 1; d <= last; d++) s.add(d);
    return s;
  };
  const weekday = (d: number): number => new Date(y, mo - 1, d).getDay();

  // 日字段
  const dm = eng.domMatcher;
  let domSet: Set<number>;
  if (dm.wild) {
    domSet = allDays();
  } else {
    domSet = new Set([...dm.values].filter(v => v >= 1 && v <= last));
    for (const sp of dm.domSpecials) {
      if (sp.type === 'L') {
        const v = last - (sp.offset ?? 0);
        if (v >= 1) domSet.add(v);
      } else if (sp.type === 'LW') {
        let d = last;
        while (d > 1 && (weekday(d) === 0 || weekday(d) === 6)) d--;
        domSet.add(d);
      } else {
        // nW：最接近 n 号的工作日（不跨月：周六往前取周五、周日往后取周一，越界则反向）
        let d = Math.min(sp.day!, last);
        const wd = weekday(d);
        if (wd === 6) d = d - 1 >= 1 ? d - 1 : d + 2;
        else if (wd === 0) d = d + 1 <= last ? d + 1 : d - 2;
        domSet.add(d);
      }
    }
  }

  // 周字段（转换为当月的“日”集合）
  const wm = eng.dowMatcher;
  let dowSet: Set<number>;
  if (wm.wild) {
    dowSet = allDays();
  } else {
    dowSet = new Set();
    for (let d = 1; d <= last; d++) {
      if (wm.values.has(weekday(d))) dowSet.add(d);
    }
    for (const sp of wm.dowSpecials) {
      if (sp.type === 'L') {
        for (let d = last; d >= 1; d--) {
          if (weekday(d) === sp.dow) { dowSet.add(d); break; }
        }
      } else {
        let c = 0;
        for (let d = 1; d <= last; d++) {
          if (weekday(d) === sp.dow && ++c === sp.nth) { dowSet.add(d); break; }
        }
      }
    }
  }

  // 日与周组合：Quartz 取交集（? 即任意）；标准 Crontab 双限定取并集（OR，Vixie Cron 行为）
  let set: Set<number>;
  if (dm.wild && wm.wild) set = allDays();
  else if (eng.dialect === 'quartz') set = intersect(domSet, dowSet);
  else if (!dm.wild && !wm.wild) set = union(domSet, dowSet);
  else set = intersect(domSet, dowSet);
  eng.dayCache.set(cacheKey, set);
  return set;
}

/** 推算后续 count 次触发时间（本地时区，严格晚于 from） */
function nextFireTimes(eng: CronEngine, count: number, from: Date = new Date()): { times: Date[]; exhausted: boolean } {
  const times: Date[] = [];
  const t = new Date(from.getTime());
  t.setMilliseconds(0);
  if (eng.hasSeconds) {
    t.setSeconds(t.getSeconds() + 1);
  } else {
    t.setMinutes(t.getMinutes() + 1);
    t.setSeconds(0);
  }
  const years = eng.yearSet ? [...eng.yearSet].sort((a, b) => a - b) : null;
  let guard = 0;
  while (times.length < count && guard++ < GUARD_MAX) {
    const y = t.getFullYear();
    if (y > MAX_YEAR) break;
    if (years && !eng.yearSet!.has(y)) {
      const ny = years.find(v => v > y);
      if (ny === undefined) break;
      t.setTime(new Date(ny, 0, 1).getTime());
      continue;
    }
    const mo = t.getMonth() + 1;
    if (!eng.monthSet.has(mo)) { t.setTime(new Date(y, mo, 1).getTime()); continue; }
    const d = t.getDate();
    if (!daySetFor(eng, y, mo).has(d)) { t.setTime(new Date(y, mo - 1, d + 1).getTime()); continue; }
    const h = t.getHours();
    if (!eng.hourSet.has(h)) { t.setTime(new Date(y, mo - 1, d, h + 1).getTime()); continue; }
    const mi = t.getMinutes();
    if (!eng.minSet.has(mi)) { t.setTime(new Date(y, mo - 1, d, h, mi + 1).getTime()); continue; }
    if (eng.hasSeconds) {
      const s = t.getSeconds();
      if (!eng.secSet.has(s)) { t.setSeconds(s + 1); continue; }
    }
    times.push(new Date(t.getTime()));
    if (eng.hasSeconds) t.setSeconds(t.getSeconds() + 1);
    else t.setTime(new Date(y, mo - 1, d, h, mi + 1).getTime());
  }
  return { times, exhausted: times.length < count };
}

function fail(input: string, error: string): CronParseResult {
  return {
    ok: false, input, dialect: 'unix', dialectForced: true, hasSeconds: false, hasYear: false,
    fields: [], warnings: [], error, nextTimes: [],
  };
}

/** 6 位表达式自动识别星期约定：出现数字 0（Quartz 非法值）则按 0=周日 约定解析 */
function autoDialect(dowRaw: string): CronDialect {
  return /(?:^|[^0-9])0(?:[^0-9]|$)/.test(dowRaw) ? 'unix' : 'quartz';
}

/** 核心解析：按字段布局解析并构建结果 */
function parseCore(tokens: string[], dialect: CronDialect, hasSeconds: boolean, hasYear: boolean, dialectForced: boolean, count: number): CronParseResult {
  const keys: FieldKey[] = hasSeconds
    ? ['second', 'minute', 'hour', 'dom', 'month', 'dow']
    : ['minute', 'hour', 'dom', 'month', 'dow'];
  if (hasYear) keys.push('year');

  const matchers = new Map<FieldKey, FieldMatcher>();
  const fields: CronFieldInfo[] = [];
  let error: string | undefined;
  let errorField: FieldKey | undefined;

  tokens.forEach((raw, i) => {
    const key = keys[i];
    const meta = FIELD_META[key];
    const info: CronFieldInfo = { key, label: meta.label, raw, desc: '—', range: rangeTip(key, dialect), cls: meta.cls };
    const r = parseField(key, raw, dialect);
    if (r.error) {
      info.error = r.error;
      if (!error) { error = r.error; errorField = key; }
    } else {
      info.desc = r.desc!;
      matchers.set(key, r.matcher!);
    }
    fields.push(info);
  });

  const base = { input: tokens.join(' '), dialect, dialectForced, hasSeconds, hasYear, fields };
  if (error) {
    return { ...base, ok: false, warnings: [], error, errorField, nextTimes: [] };
  }

  // 语义警告
  const warnings: string[] = [];
  const domM = matchers.get('dom')!;
  const dowM = matchers.get('dow')!;
  if (!domM.wild && !dowM.wild) {
    warnings.push(dialect === 'quartz'
      ? 'Quartz 规范要求在“日”和“周”字段中使用一个“?”，两者不能同时限定；此处已按“同时满足（AND）”解释'
      : '“日”和“周”字段同时限定：标准 Crontab（Vixie Cron）按“满足其一即触发（OR）”解释');
  }
  if (dialect === 'unix' && !hasSeconds && (domM.question || dowM.question)) {
    // Spring（6 位）本身支持 ?，仅标准 5 位 Crontab 需要提示
    warnings.push('“?”是 Quartz/Spring 扩展字符，标准 5 位 Crontab 并不支持，此处已按“*”（任意值）解释');
  }

  const engine = buildEngine(matchers, dialect, hasSeconds, hasYear);
  const { times, exhausted } = nextFireTimes(engine, count);
  const description = describe(tokens, keys, dialect);
  return { ...base, ok: true, warnings, description, nextTimes: times, exhausted };
}

/**
 * 解析 Cron 表达式
 * @param input {string} Cron 表达式（5/6/7 位或 @别名）
 * @param dialectPref {CronDialect | 'auto'} 6 位表达式的星期数字约定偏好，默认 auto（出现 0 则按 unix，否则按 quartz）
 * @param count {number} 推算的后续触发次数，默认 10
 */
export function parseCron(input: string, dialectPref: CronDialect | 'auto' = 'auto', count = 10): CronParseResult {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return fail(trimmed, '请输入 Cron 表达式');

  // 预定义别名
  if (trimmed.startsWith('@')) {
    const up = trimmed.toUpperCase();
    if (up.startsWith('@EVERY')) {
      return fail(trimmed, '“@every”是 robfig/cron（Go）的扩展语法，表示固定间隔执行，本工具暂不支持解析');
    }
    if (up === '@REBOOT') {
      return {
        ok: true, input: trimmed, dialect: 'unix', dialectForced: true, hasSeconds: false, hasYear: false,
        alias: { name: trimmed }, noFire: true, fields: [], warnings: [],
        description: '系统（服务）启动时运行一次，没有固定的触发时间', nextTimes: [],
      };
    }
    const expanded = ALIASES[up];
    if (!expanded) {
      return fail(trimmed, `未知的预定义表达式“${trimmed}”，支持：@yearly/@annually、@monthly、@weekly、@daily/@midnight、@hourly、@reboot`);
    }
    const r = parseCore(expanded.split(' '), 'unix', false, false, true, count);
    return { ...r, input: trimmed, alias: { name: trimmed, expanded } };
  }

  const tokens = trimmed.split(' ');
  if (tokens.length < 5 || tokens.length > 7) {
    return fail(trimmed, `Cron 表达式应为 5、6 或 7 个字段，当前为 ${tokens.length} 个。5 位＝分 时 日 月 周（标准 Crontab）；6/7 位＝秒 分 时 日 月 周 [年]（Quartz/Spring）`);
  }

  const hasSeconds = tokens.length >= 6;
  const hasYear = tokens.length === 7;
  let dialect: CronDialect;
  let dialectForced = true;
  if (!hasSeconds) {
    dialect = 'unix';
  } else if (hasYear) {
    dialect = 'quartz';
  } else {
    dialectForced = false;
    dialect = dialectPref === 'auto' ? autoDialect(tokens[5]) : dialectPref;
  }
  return parseCore(tokens, dialect, hasSeconds, hasYear, dialectForced, count);
}
