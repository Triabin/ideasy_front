/**
 * 十二时辰对照数据、当前时辰推算与天空光照模型
 * - SHICHEN：十二时辰对照表（含生肖、古称、初/正、词语来源）
 * - getShiChenState：由 Date 推算当前时辰、初/正、刻与进度
 * - computeSky：由一天中的时刻（浮点小时）计算天空颜色、日月位置、星辰可见度，
 *   使背景光照随时间连续变化（日出、正午、日落、深夜）
 */

/* ========================== 基础数据 ========================== */

/** 时辰对应的词语来源 */
export interface ShiChenWord {
  /** 词语/典故名 */
  term: string;
  /** 来源说明 */
  text: string;
}

/** 单个时辰的完整信息 */
export interface ShiChenItem {
  /** 地支：子~亥 */
  zhi: string;
  /** 时辰名：子时~亥时 */
  name: string;
  /** 古称：夜半、鸡鸣、平旦…… */
  alias: string;
  /** 生肖 */
  animal: string;
  /** 起始小时（24 小时制，子时为 23） */
  startHour: number;
  /** 现代时间范围，如 23:00 - 01:00 */
  range: string;
  /** “初”段说明，如 子初 23:00 - 00:00 */
  chu: string;
  /** “正”段说明，如 子正 00:00 - 01:00 */
  zheng: string;
  /** 主题色（生肖印章等点缀用） */
  accent: string;
  /** 生肖配属由来 */
  brief: string;
  /** 词语来源 */
  word: ShiChenWord;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** 跨日小时（如 25）折算为 0-23 的整点写法 */
const hhmm = (h: number) => `${pad(((h % 24) + 24) % 24)}:00`;

type RawShiChen = Omit<ShiChenItem, 'name' | 'range' | 'chu' | 'zheng'>;

const RAW_SHICHEN: RawShiChen[] = [
  {
    zhi: '子', alias: '夜半', animal: '鼠', startHour: 23, accent: '#3b4a8f',
    brief: '深夜老鼠最为活跃，趁夜色出洞觅食，故“子”配“鼠”。',
    word: {
      term: '三更半夜',
      text: '古人把一夜分为五更，三更正对应子时。子时恰居夜之中，故深夜被称为“三更半夜”，午夜也称“子夜”。',
    },
  },
  {
    zhi: '丑', alias: '鸡鸣', animal: '牛', startHour: 1, accent: '#2c4a7c',
    brief: '此时牛开始反刍，农家常起身喂牛，故“丑”配“牛”。',
    word: {
      term: '鸡鸣狗盗',
      text: '出自《史记·孟尝君列传》：孟尝君夜逃至函谷关，关法规定鸡鸣（丑时）才开关门，门客学鸡鸣引得众鸡齐啼，得以出关。后以“鸡鸣狗盗”比喻微不足道的伎俩。',
    },
  },
  {
    zhi: '寅', alias: '平旦', animal: '虎', startHour: 3, accent: '#5c4a9e',
    brief: '天将亮未亮，老虎此时常下山觅食，最为凶猛，故“寅”配“虎”。',
    word: {
      term: '寅吃卯粮',
      text: '“寅”“卯”同为地支，寅在卯前。寅年就吃掉了卯年的粮，比喻入不敷出、预先挪借，是形容经济窘迫的常用语。',
    },
  },
  {
    zhi: '卯', alias: '日出', animal: '兔', startHour: 5, accent: '#e8813a',
    brief: '旭日东升，晨光初露，草露尚湿，兔子此时出窝吃草，故“卯”配“兔”。',
    word: {
      term: '点卯',
      text: '旧时官署于卯时（清晨 5 至 7 点）上班应差，长官照名册点名查核，称为“点卯”；报到称“应卯”、签到称“画卯”。后来“点卯”也指到场应付一下。',
    },
  },
  {
    zhi: '辰', alias: '食时', animal: '龙', startHour: 7, accent: '#d9a526',
    brief: '相传此时为龙行雨之时，晨雾未散，故“辰”配“龙”。',
    word: {
      term: '良辰吉日',
      text: '古人朝食在辰时，故称“食时”。“辰”本义为农耕器具，后借指时间，如今“生辰”“良辰美景”“良辰吉日”都还保留着“时辰、时光”之义。',
    },
  },
  {
    zhi: '巳', alias: '隅中', animal: '蛇', startHour: 9, accent: '#2e9e7a',
    brief: '蛇类此时蜷伏草丛，不伤行人，故“巳”配“蛇”。',
    word: {
      term: '上巳节',
      text: '农历三月初三称“上巳”，古人于此日临水祓禊、洗濯宿垢，渐演化为踏青与曲水流觞之俗。王羲之《兰亭集序》所记兰亭雅集，正是上巳节的修禊之事。',
    },
  },
  {
    zhi: '午', alias: '日中', animal: '马', startHour: 11, accent: '#d94f4f',
    brief: '烈日当空，动物多伏地休息，唯马仍昂首而立，故“午”配“马”。',
    word: {
      term: '午时三刻',
      text: '旧时处决人犯多选在“午时三刻”——约 11 时 30 分至 45 分之间，人们相信日中天时阳气最盛，可震慑犯人的阴魂。今天的“上午”“下午”，也是以午时（正午）为界得名。',
    },
  },
  {
    zhi: '未', alias: '日昳', animal: '羊', startHour: 13, accent: '#d99a4f',
    brief: '此时是放牧的好时候，羊食草而不伤草根，故“未”配“羊”。',
    word: {
      term: '日昳',
      text: '“昳”指太阳偏西。《说文解字》：“未，味也。”日过中天，万物成熟而有味，故以此名“未”。',
    },
  },
  {
    zhi: '申', alias: '晡时', animal: '猴', startHour: 15, accent: '#c9762e',
    brief: '猴子最喜欢在此时啼叫玩耍，故“申”配“猴”。',
    word: {
      term: '三令五申',
      text: '出自《史记·孙子吴起列传》：孙武操练宫女，三令五申军法。“申”有陈述、重申之义，成语指反复命令告诫。古人一日两餐，第二餐在申时，故申时又称“晡时”。',
    },
  },
  {
    zhi: '酉', alias: '日入', animal: '鸡', startHour: 17, accent: '#b0524f',
    brief: '太阳落山，鸡群归窝，故“酉”配“鸡”。',
    word: {
      term: '酉与酒',
      text: '“酉”的甲骨文字形像一只酒坛。日落收工正是酿酒、饮酒的时辰，因此“酒”“酿”“酌”“醉”“醒”等与酒相关的字，几乎都以“酉”为偏旁。',
    },
  },
  {
    zhi: '戌', alias: '黄昏', animal: '狗', startHour: 19, accent: '#6a4f9e',
    brief: '天色掩暗，人们关门歇息，狗卧门前守夜，故“戌”配“狗”。',
    word: {
      term: '人约黄昏后',
      text: '出自宋代欧阳修《生查子·元夕》：“月上柳梢头，人约黄昏后。”黄昏正是戌时，天光初暗、月挂柳梢，写尽了相约的朦胧之美。戌时也是五更中“一更”的开始。',
    },
  },
  {
    zhi: '亥', alias: '人定', animal: '猪', startHour: 21, accent: '#3f4a7a',
    brief: '夜深人静，猪睡得最香，故“亥”配“猪”。',
    word: {
      term: '人定',
      text: '“人定”意为人们停止活动、安歇入睡。汉乐府《孔雀东南飞》有“奄奄黄昏后，寂寂人定初”，“人定初”即指亥时之始。',
    },
  },
];

/** 十二时辰对照表（自子时起） */
export const SHICHEN: ShiChenItem[] = RAW_SHICHEN.map(item => ({
  ...item,
  name: `${item.zhi}时`,
  range: `${hhmm(item.startHour)} - ${hhmm(item.startHour + 2)}`,
  chu: `${item.zhi}初 ${hhmm(item.startHour)} - ${hhmm(item.startHour + 1)}`,
  zheng: `${item.zhi}正 ${hhmm(item.startHour + 1)} - ${hhmm(item.startHour + 2)}`,
}));

/* ========================== 当前时辰推算 ========================== */

/** 当前时刻对应的时辰状态 */
export interface ShiChenState {
  /** 时辰索引：0=子 … 11=亥 */
  index: number;
  /** 当前时辰 */
  item: ShiChenItem;
  /** 初/正 */
  phase: 'chu' | 'zheng';
  /** 初/正标签，如“子初” */
  phaseLabel: string;
  /** 初/正对应的时间段，如“23:00 - 00:00” */
  phaseRange: string;
  /** 当前是本时辰的第几刻（1~8，一刻约 15 分钟） */
  ke: number;
  /** 本时辰已过进度 0~1 */
  progress: number;
  /** 全天进度 0~1（自子时 23:00 起算） */
  dayProgress: number;
  /** 当前时刻的浮点小时数 0~24（供光照模型使用） */
  hoursFloat: number;
}

/**
 * 由日期对象推算当前时辰状态
 * @param date {Date} 日期对象
 */
export function getShiChenState(date: Date): ShiChenState {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const index = Math.floor(((h + 1) % 24) / 2);
  const item = SHICHEN[index];
  // 自子时（23:00）起算的分钟数与本时辰内的分钟数
  const minsFromZi = (h * 60 + m + 60) % 1440;
  const minsInto = minsFromZi % 120;
  const phase = minsInto < 60 ? 'chu' : 'zheng';
  return {
    index,
    item,
    phase,
    phaseLabel: `${item.zhi}${phase === 'chu' ? '初' : '正'}`,
    phaseRange: phase === 'chu'
      ? `${hhmm(item.startHour)} - ${hhmm(item.startHour + 1)}`
      : `${hhmm(item.startHour + 1)} - ${hhmm(item.startHour + 2)}`,
    ke: Math.min(8, Math.max(1, Math.ceil(minsInto / 15))),
    progress: (minsInto * 60 + s) / 7200,
    dayProgress: (minsFromZi * 60 + s) / 86400,
    hoursFloat: h + m / 60 + s / 3600,
  };
}

/**
 * 某时辰的中点时刻（浮点小时），用于展示该时辰的代表性天光
 * @param index {number} 时辰索引
 */
export const midHourOf = (index: number): number => (SHICHEN[index].startHour + 1) % 24;

/* ========================== 天空光照模型 ========================== */

export type RGB = [number, number, number];

/** 天空状态：颜色、日月位置（百分比坐标）与可见度 */
export interface SkyState {
  /** 天顶颜色 */
  zenith: RGB;
  /** 地平线颜色 */
  horizon: RGB;
  /** 太阳高度角 -1 ~ 1（6 时日出为 0，正午为 1，午夜为 -1） */
  sunAlt: number;
  /** 背景渐变 CSS */
  bgGradient: string;
  /** 星辰可见度 0~1 */
  starOpacity: number;
  /** 云层可见度 0~1 */
  cloudOpacity: number;
  /** 日/月位置（% 坐标）与透明度 */
  sunX: number;
  sunY: number;
  sunOpacity: number;
  moonX: number;
  moonY: number;
  moonOpacity: number;
  /** 地平线附近霞光强度 0~1 */
  glowOpacity: number;
  /** 远山/近山剪影颜色 */
  hillFar: string;
  hillNear: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const cssRGB = (c: RGB) => `rgb(${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])})`;

/**
 * 太阳高度角：6 时日出（0），正午中天（1），18 时日落（0），午夜最低（-1）
 * @param t {number} 一天中的时刻（浮点小时 0~24）
 */
export const sunAltitude = (t: number): number => Math.sin(((t - 6) / 12) * Math.PI);

/** 按太阳高度角插值的天空颜色关键帧（自深夜至正午） */
const SKY_STOPS: { alt: number; zenith: RGB; horizon: RGB }[] = [
  { alt: -1.0, zenith: [5, 8, 22], horizon: [12, 17, 42] },
  { alt: -0.5, zenith: [9, 15, 42], horizon: [24, 31, 68] },
  { alt: -0.25, zenith: [24, 33, 82], horizon: [74, 58, 104] },
  { alt: -0.08, zenith: [56, 66, 128], horizon: [168, 98, 110] },
  { alt: 0.05, zenith: [96, 122, 178], horizon: [242, 148, 92] },
  { alt: 0.25, zenith: [98, 156, 216], horizon: [214, 230, 244] },
  { alt: 1.0, zenith: [58, 128, 214], horizon: [166, 210, 244] },
];

/** 天体沿半圆弧移动：p=0 升起、p=0.5 中天、p=1 落下，返回 % 坐标 */
const arcPos = (p: number) => {
  const k = clamp01(p);
  return { x: 6 + k * 88, y: 80 - Math.sin(k * Math.PI) * 64 };
};

/**
 * 计算某时刻的天空状态
 * @param t {number} 一天中的时刻（浮点小时 0~24）
 */
export function computeSky(t: number): SkyState {
  const alt = sunAltitude(t);
  // 颜色：在关键帧之间按太阳高度角插值
  let i = 1;
  while (i < SKY_STOPS.length && alt > SKY_STOPS[i].alt) i++;
  let zenith: RGB;
  let horizon: RGB;
  if (i >= SKY_STOPS.length) {
    zenith = SKY_STOPS[SKY_STOPS.length - 1].zenith;
    horizon = SKY_STOPS[SKY_STOPS.length - 1].horizon;
  } else {
    const a = SKY_STOPS[i - 1];
    const b = SKY_STOPS[i];
    const k = clamp01((alt - a.alt) / (b.alt - a.alt));
    zenith = lerpRGB(a.zenith, b.zenith, k);
    horizon = lerpRGB(a.horizon, b.horizon, k);
  }
  // 日月位置：太阳 6 时升 18 时落，月亮 18 时升次日 6 时落
  const sun = arcPos((t - 6) / 12);
  const moon = arcPos(t >= 18 ? (t - 18) / 12 : (t + 6) / 12);
  const mid = lerpRGB(zenith, horizon, 0.55);
  return {
    zenith,
    horizon,
    sunAlt: alt,
    bgGradient: `linear-gradient(to bottom, ${cssRGB(zenith)} 0%, ${cssRGB(mid)} 52%, ${cssRGB(horizon)} 100%)`,
    starOpacity: clamp01((-alt - 0.02) / 0.2),
    cloudOpacity: 0.14 + clamp01(alt) * 0.42,
    sunX: sun.x,
    sunY: sun.y,
    sunOpacity: clamp01((alt + 0.22) / 0.3),
    moonX: moon.x,
    moonY: moon.y,
    moonOpacity: clamp01((0.22 - alt) / 0.3),
    glowOpacity: clamp01(1 - Math.abs(alt) / 0.4) * 0.85,
    hillFar: cssRGB(lerpRGB(horizon, [8, 10, 26], 0.68)),
    hillNear: cssRGB(lerpRGB(horizon, [5, 6, 18], 0.84)),
  };
}

/** 各时辰中点时刻的天空状态与渐变条（时辰卡片/时间轴用，仅与数据有关，计算一次即可） */
export const SKY_MID: SkyState[] = SHICHEN.map((_, i) => computeSky(midHourOf(i)));
export const STRIPS: string[] = SKY_MID.map(sky => `linear-gradient(to bottom, ${cssRGB(sky.zenith)}, ${cssRGB(sky.horizon)})`);

/**
 * 某时辰中点时刻的天体（日或月）位置，用于卡片渐变条上的小圆点
 * @param index {number} 时辰索引
 */
export function midBody(index: number): { x: number; y: number; isSun: boolean } {
  const sky = SKY_MID[index];
  const isSun = sky.sunOpacity >= sky.moonOpacity;
  return { x: isSun ? sky.sunX : sky.moonX, y: isSun ? sky.sunY : sky.moonY, isSun };
}

/* ========================== 星辰 ========================== */

/** 单颗星星的布局参数 */
export interface Star {
  id: number;
  /** 位置（%） */
  x: number;
  y: number;
  /** 半径（px） */
  r: number;
  /** 基础透明度 */
  o: number;
  /** 闪烁动画时长/延迟（s） */
  dur: number;
  delay: number;
}

/**
 * 生成固定伪随机星空（同一 seed 每次渲染结果一致，避免闪烁跳变）
 * @param count {number} 星星数量
 * @param seed {number} 随机种子
 */
export function makeStars(count = 80, seed = 20261124): Star[] {
  let s = seed;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: rand() * 100,
    y: rand() * 60,
    r: 0.6 + rand() * 1.5,
    o: 0.35 + rand() * 0.65,
    dur: 2 + rand() * 3.5,
    delay: rand() * 4,
  }));
}
