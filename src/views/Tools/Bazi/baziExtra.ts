/**
 * 八字排盘辅助数据与算法：
 * zhiji-bazi 入口只导出引擎层（四柱、身强弱、格局、用神、真太阳时、节气），
 * 天干地支汉字、五行、藏干、十神、六十甲子、纳音等基础表由其模型定义自行补齐；
 * 大运（起运方向/起运岁数/排布）库内未实现，这里按传统口径计算。
 */
import {
  localComponents,
  solarTermDate,
  yearPillar,
  type BaZi,
  type DiZhi,
  type Pillar,
  type ShiShen,
  type TianGan,
  type WuXing,
} from 'zhiji-bazi';

/* ========================== 基础表 ========================== */

/** 天干代码顺序（与 zhiji-bazi TIANGAN_CODES 一致） */
export const GAN_CODES = ['jia', 'yi', 'bing', 'ding', 'wu', 'ji', 'geng', 'xin', 'ren', 'gui'] as const satisfies readonly TianGan[];
/** 地支代码顺序（与 zhiji-bazi DIZHI_CODES 一致） */
export const ZHI_CODES = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu_dz', 'wei', 'shen', 'you', 'xu', 'hai'] as const satisfies readonly DiZhi[];

export const GAN_ZH: Record<TianGan, string> = {
  jia: '甲', yi: '乙', bing: '丙', ding: '丁', wu: '戊',
  ji: '己', geng: '庚', xin: '辛', ren: '壬', gui: '癸',
};
export const ZHI_ZH: Record<DiZhi, string> = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  wu_dz: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};
export const WUXING_ZH: Record<WuXing, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
export const WUXING_LIST: WuXing[] = ['wood', 'fire', 'earth', 'metal', 'water'];

/** 五行展示色 */
export const WUXING_COLOR: Record<WuXing, string> = {
  wood: '#3E9C6B',
  fire: '#E15B43',
  earth: '#C08A3E',
  metal: '#8E9AA6',
  water: '#3E7BD6',
};

const GAN_WUXING: Record<TianGan, WuXing> = {
  jia: 'wood', yi: 'wood', bing: 'fire', ding: 'fire', wu: 'earth',
  ji: 'earth', geng: 'metal', xin: 'metal', ren: 'water', gui: 'water',
};
const ZHI_WUXING: Record<DiZhi, WuXing> = {
  zi: 'water', chou: 'earth', yin: 'wood', mao: 'wood', chen: 'earth', si: 'fire',
  wu_dz: 'fire', wei: 'earth', shen: 'metal', you: 'metal', xu: 'earth', hai: 'water',
};
/** 阳干：甲丙戊庚壬 */
const GAN_YANG: Record<TianGan, boolean> = {
  jia: true, yi: false, bing: true, ding: false, wu: true,
  ji: false, geng: true, xin: false, ren: true, gui: false,
};
/** 相生：木→火→土→金→水→木 */
const GEN_NEXT: Record<WuXing, WuXing> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
/** 相克：木→土→水→火→金→木 */
const KE_NEXT: Record<WuXing, WuXing> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

export const ganWuxing = (g: TianGan): WuXing => GAN_WUXING[g];
export const zhiWuxing = (z: DiZhi): WuXing => ZHI_WUXING[z];
export const ganIsYang = (g: TianGan): boolean => GAN_YANG[g];

/** 地支藏干（本气/中气/余气，权重沿用子平真诠口径：本气 5、中气 2~3、余气 1，单支藏干取满 8） */
export const HIDDEN_STEMS: Record<DiZhi, { gan: TianGan; w: number }[]> = {
  zi: [{ gan: 'gui', w: 8 }],
  chou: [{ gan: 'ji', w: 5 }, { gan: 'gui', w: 2 }, { gan: 'xin', w: 1 }],
  yin: [{ gan: 'jia', w: 5 }, { gan: 'bing', w: 2 }, { gan: 'wu', w: 1 }],
  mao: [{ gan: 'yi', w: 8 }],
  chen: [{ gan: 'wu', w: 5 }, { gan: 'yi', w: 2 }, { gan: 'gui', w: 1 }],
  si: [{ gan: 'bing', w: 5 }, { gan: 'geng', w: 2 }, { gan: 'wu', w: 1 }],
  wu_dz: [{ gan: 'ding', w: 5 }, { gan: 'ji', w: 3 }],
  wei: [{ gan: 'ji', w: 5 }, { gan: 'ding', w: 2 }, { gan: 'yi', w: 1 }],
  shen: [{ gan: 'geng', w: 5 }, { gan: 'ren', w: 2 }, { gan: 'wu', w: 1 }],
  you: [{ gan: 'xin', w: 8 }],
  xu: [{ gan: 'wu', w: 5 }, { gan: 'xin', w: 2 }, { gan: 'ding', w: 1 }],
  hai: [{ gan: 'ren', w: 5 }, { gan: 'jia', w: 3 }],
};

export const SHISHEN_ZH: Record<ShiShen, string> = {
  biJian: '比肩', jieCai: '劫财', shiShen: '食神', shangGuan: '伤官', zhengCai: '正财',
  pianCai: '偏财', zhengGuan: '正官', qiSha: '七杀', zhengYin: '正印', pianYin: '偏印',
};

/**
 * 十神：以日干为“我”，看其他天干与我者的生克及阴阳异同
 * @param dayStem {TianGan} 日干（日主）
 * @param other {TianGan} 其他天干
 */
export function shiShenOf(dayStem: TianGan, other: TianGan): ShiShen {
  if (other === dayStem) return 'biJian';
  const me = GAN_WUXING[dayStem];
  const it = GAN_WUXING[other];
  const samePolarity = GAN_YANG[dayStem] === GAN_YANG[other];
  if (me === it) return samePolarity ? 'biJian' : 'jieCai';
  if (GEN_NEXT[me] === it) return samePolarity ? 'shiShen' : 'shangGuan';
  if (KE_NEXT[me] === it) return samePolarity ? 'pianCai' : 'zhengCai';
  if (KE_NEXT[it] === me) return samePolarity ? 'qiSha' : 'zhengGuan';
  return samePolarity ? 'pianYin' : 'zhengYin';
}

/** 六十甲子序号：0=甲子 … 59=癸亥 */
export function sexagenaryIndex(p: Pillar): number {
  const g = GAN_CODES.indexOf(p.tianGan);
  const z = ZHI_CODES.indexOf(p.diZhi);
  for (let n = 0; n < 60; n++) {
    if (n % 10 === g && n % 12 === z) return n;
  }
  return 0;
}

/** 由六十甲子序号还原柱 */
export function pillarFromSexagenaryIndex(n: number): Pillar {
  const i = ((n % 60) + 60) % 60;
  return { tianGan: GAN_CODES[i % 10], diZhi: ZHI_CODES[i % 12] };
}

export const pillarChinese = (p: Pillar): string => `${GAN_ZH[p.tianGan]}${ZHI_ZH[p.diZhi]}`;

/** 六十甲子纳音（每两柱一组，共三十组） */
const NAYIN: string[] = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火',
  '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土',
  '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木',
  '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];
export const nayinOf = (p: Pillar): string => NAYIN[Math.floor(sexagenaryIndex(p) / 2)];

/** 地支生肖 */
export const ZHI_ANIMAL: Record<DiZhi, string> = {
  zi: '鼠', chou: '牛', yin: '虎', mao: '兔', chen: '龙', si: '蛇',
  wu_dz: '马', wei: '羊', shen: '猴', you: '鸡', xu: '狗', hai: '猪',
};

/** 农历日名（初一~三十） */
const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];
export const lunarDayName = (day: number): string => LUNAR_DAY_NAMES[day - 1] ?? `${day}`;

/* ========================== 大运 ========================== */

/** 一步大运 */
export interface DaYunItem {
  /** 第几步（1 起） */
  index: number;
  /** 大运干支 */
  pillar: Pillar;
  /** 起运周岁年龄 */
  startAge: number;
  /** 起运公历年 */
  startYear: number;
  /** 起运日期 */
  startDate: Date;
}

/** 大运排布结果 */
export interface DaYunInfo {
  /** 顺行（阳男阴女）/ 逆行（阴男阳女） */
  forward: boolean;
  /** 起运岁数描述，如“3 年 4 个月” */
  startAgeText: string;
  /** 起运日期 */
  qiYunDate: Date;
  /** 十步大运 */
  items: DaYunItem[];
}

const DAY_MS = 86400000;

const addYears = (d: Date, y: number) => {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + y);
  return r;
};
const addMonths = (d: Date, m: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

/** 两个日期之间的周岁年龄 */
function fullYears(from: Date, to: Date): number {
  let y = to.getFullYear() - from.getFullYear();
  const before = to.getMonth() < from.getMonth() || (to.getMonth() === from.getMonth() && to.getDate() < from.getDate());
  if (before) y--;
  return Math.max(0, y);
}

/**
 * 出生日前后最近的“节”（月令交界，小寒/立春/惊蛰…大雪，共十二个）
 * @param birth {Date} 出生时刻
 */
function nearestJie(birth: Date, forward: boolean): Date | null {
  const y = birth.getFullYear();
  const all: Date[] = [];
  for (let year = y - 1; year <= y + 1; year++) {
    for (let i = 0; i < 12; i++) {
      const d = solarTermDate(year, i);
      if (d) all.push(d);
    }
  }
  all.sort((a, b) => a.getTime() - b.getTime());
  if (forward) return all.find(d => d.getTime() > birth.getTime()) ?? null;
  return [...all].reverse().find(d => d.getTime() < birth.getTime()) ?? null;
}

/**
 * 排大运：阳男阴女顺行、阴男阳女逆行；起运岁数按“三天折一年、一天折四个月、一时辰折十天”换算。
 * @param birth {Date} 出生时刻（已按所选时区/真太阳时处理）
 * @param bazi {BaZi} 命盘
 * @param tz {string} IANA 时区（用于读取起运年份的墙上时间）
 * @param isMale {boolean} 性别
 */
export function buildDaYun(birth: Date, bazi: BaZi, tz: string, isMale: boolean): DaYunInfo | null {
  const yearStem = bazi.yearPillar.tianGan;
  const forward = ganIsYang(yearStem) === isMale;
  const jie = nearestJie(birth, forward);
  if (!jie) return null;
  const days = Math.abs(jie.getTime() - birth.getTime()) / DAY_MS;
  let years = Math.floor(days / 3);
  let rem = days - years * 3;
  let months = Math.floor(rem * 4);
  let remM = rem * 4 - months;
  let d = Math.round(remM * 30);
  if (d >= 30) {
    d -= 30;
    months++;
  }
  if (months >= 12) {
    months -= 12;
    years++;
  }
  const qiYunDate = addDays(addMonths(addYears(birth, years), months), d);
  const monthIdx = sexagenaryIndex(bazi.monthPillar);
  const items: DaYunItem[] = [];
  for (let k = 1; k <= 10; k++) {
    const startDate = addYears(qiYunDate, 10 * (k - 1));
    items.push({
      index: k,
      pillar: pillarFromSexagenaryIndex(monthIdx + (forward ? k : -k)),
      startAge: fullYears(birth, startDate),
      startYear: localComponents(startDate, tz).year,
      startDate,
    });
  }
  return {
    forward,
    startAgeText: `${years} 年 ${months} 个月${d ? ` ${d} 天` : ''}`,
    qiYunDate,
    items,
  };
}

/** 某步大运内的十个流年 */
export interface LiuNianItem {
  year: number;
  pillar: Pillar;
  /** 虚岁 */
  nominalAge: number;
}

export function liuNianOf(item: DaYunItem, birthYear: number): LiuNianItem[] {
  return Array.from({ length: 10 }, (_, j) => {
    const year = item.startYear + j;
    return { year, pillar: yearPillar(year), nominalAge: year - birthYear + 1 };
  });
}
