/**
 * 随机姓名生成：姓氏库与名字用字库
 * 字库为常见人名用字的精选子集，仅用于生成测试数据与灵感参考。
 */

/** 常见单字姓（按人口占比大致排序） */
export const SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡',
  '郭', '何', '林', '罗', '高', '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
  '彭', '曾', '肖', '田', '董', '袁', '潘', '于', '蒋', '蔡', '余', '杜', '叶', '程', '苏',
  '魏', '吕', '丁', '任', '沈', '姚', '卢', '姜', '崔', '钟', '谭', '陆', '汪', '范', '金',
  '石', '廖', '贾', '夏', '韦', '付', '方', '白', '邹', '孟', '熊', '秦', '邱', '江', '尹',
  '薛', '闫', '段', '雷', '侯', '龙', '史', '陶', '黎', '贺', '顾', '毛', '郝', '龚', '邵',
];

/** 常见复姓 */
export const COMPOUND_SURNAMES = [
  '欧阳', '司马', '上官', '诸葛', '东方', '皇甫', '尉迟', '公孙', '令狐', '长孙',
  '慕容', '司徒', '司空', '宇文', '轩辕', '百里', '呼延', '端木', '夏侯', '独孤',
  '南宫', '西门', '左丘', '第五', '钟离',
];

/** 男性名字常用字 */
export const MALE_CHARS = [
  '伟', '强', '磊', '军', '洋', '勇', '杰', '涛', '明', '辉', '鹏', '斌', '宇', '浩', '凯',
  '健', '俊', '帆', '帅', '旭', '波', '刚', '毅', '建', '志', '成', '天', '泽', '轩', '晨',
  '博', '然', '豪', '睿', '哲', '恒', '霖', '峰', '阳', '鸣', '骏', '宸', '铭', '锐', '楠',
  '柏', '松', '岩', '川', '洲', '航', '昊', '翔', '麟', '威', '汉', '江', '岳', '琦', '栋',
];

/** 女性名字常用字 */
export const FEMALE_CHARS = [
  '芳', '娜', '敏', '静', '丽', '婷', '雪', '慧', '琳', '倩', '颖', '萍', '洁', '璐', '瑶',
  '薇', '欣', '怡', '悦', '妍', '珊', '蕾', '菲', '婉', '彤', '佳', '琪', '淑', '惠', '珠',
  '翠', '雅', '芝', '兰', '凤', '秀', '娟', '英', '玉', '红', '玲', '芬', '燕', '彩', '春',
  '菊', '月', '莹', '晗', '熙', '柔', '璇', '姝', '淼', '筠', '汐', '诗', '语', '梦', '晴',
];

/** 中性名字常用字 */
export const NEUTRAL_CHARS = [
  '子', '一', '之', '亦', '安', '乐', '宁', '瑞', '嘉', '可', '沐', '文', '景', '希', '言',
  '和', '千', '奕', '允', '元', '思', '雨', '辰', '星',
];

/** 性别选项：any 表示不限（生成时随机指派男/女） */
export type Gender = 'any' | 'male' | 'female';
/** 姓氏类型：单姓 / 复姓 / 随机混合 / 自定义 */
export type SurnameMode = 'single' | 'compound' | 'mix' | 'custom';

/** 生成结果 */
export type GenName = {
  /** 完整姓名 */
  name: string;
  /** 生成时实际指派的性别（any 会被随机指派） */
  gender: 'male' | 'female';
  /** 是否复姓 */
  compound: boolean;
  /** 实际使用的字辈用字（未开启字辈时为 undefined） */
  generation?: string;
};

/** 生成选项 */
export type NameOptions = {
  /** 性别倾向，any 时按 50/50 随机 */
  gender: Gender;
  /** 名字字数（1 或 2），random 时约 3/4 概率为两字名；开启字辈时忽略该选项、固定为 2 */
  givenLen: number | 'random';
  /** 姓氏类型，mix 时约 12% 概率复姓 */
  surnameMode: SurnameMode;
  /** 自定义姓氏（surnameMode 为 custom 时生效，单字或多字均可） */
  customSurname?: string;
  /**
   * 字辈用字：一个或多个字，每个字为一个字辈、生成时随机取用；空串视为未开启。
   * 开启后所有姓名必用字辈，且这些字（含未被抽中的其他辈分用字）绝不会再出现在名字其余部分。
   */
  generationChars?: string;
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * 生成一个随机中文姓名
 * @param opts {NameOptions} 生成选项
 * @throws {Error} 自定义姓氏模式下未填写姓氏时抛出
 */
export function randomName(opts: NameOptions): GenName {
  const g = opts.gender === 'any' ? (Math.random() < 0.5 ? 'male' : 'female') : opts.gender;

  // 姓氏
  let compound = false;
  let surname: string;
  if (opts.surnameMode === 'custom') {
    surname = (opts.customSurname ?? '').trim();
    if (!surname) throw new Error('请先填写自定义姓氏');
  } else {
    if (opts.surnameMode === 'single') compound = false;
    else if (opts.surnameMode === 'compound') compound = true;
    else compound = Math.random() < 0.12;
    surname = compound ? pick(COMPOUND_SURNAMES) : pick(SURNAMES);
  }

  // 字辈：开启后所有姓名必用，输入多个字（每个字为一个字辈）时随机取一
  const genChars = Array.from((opts.generationChars ?? '').trim());
  const generation = genChars.length > 0 ? pick(genChars) : undefined;

  // 名字字数：开启字辈时固定两字（字辈 + 一名用字）——实际取名中字辈绝不单独成名
  const len = generation ? 2 : (opts.givenLen === 'random' ? (Math.random() < 0.75 ? 2 : 1) : opts.givenLen);
  const basePool = g === 'male'
      ? [...MALE_CHARS, ...NEUTRAL_CHARS]
      : [...FEMALE_CHARS, ...NEUTRAL_CHARS];

  // 名用字池：排除全部字辈用字（含未被抽中的其他辈分用字），确保它们绝不出现在名字其余部分
  const pool = basePool.filter(c => !genChars.includes(c));
  if (pool.length === 0) {
    throw new Error('名用字池已空：字辈用字与常用名用字重合过多');
  }

  // 名字：使用字辈时置于名首，两字名在字辈后再配一个名用字；名字内部不重复用字
  let given = generation ?? '';
  while (given.length < len) {
    const c = pick(pool);
    if (!given.includes(c)) given += c;
  }
  return { name: surname + given, gender: g, compound, generation };
}
