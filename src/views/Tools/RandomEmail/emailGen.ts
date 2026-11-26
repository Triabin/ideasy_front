/**
 * 随机邮箱生成：三种用户名风格（英文单词组合 / 拼音音节 / 随机字母）+ 常见或自定义域名
 * 仅用于生成测试数据。
 */

/** 常见邮箱域名 */
export const DOMAINS = [
  'qq.com', '163.com', '126.com', 'gmail.com', 'outlook.com', 'foxmail.com',
  'sina.com', 'sohu.com', 'aliyun.com', 'icloud.com', 'hotmail.com',
  'yeah.net', '139.com', 'proton.me',
];

/** 用户名用英文形容词 */
const ADJECTIVES = [
  'happy', 'lucky', 'brave', 'calm', 'clever', 'cool', 'crazy', 'eager', 'epic', 'fancy',
  'fast', 'fresh', 'funny', 'gentle', 'giant', 'golden', 'great', 'green', 'honest', 'jolly',
  'keen', 'kind', 'light', 'lively', 'lovely', 'magic', 'merry', 'mighty', 'misty', 'noble',
  'proud', 'purple', 'quiet', 'rapid', 'rare', 'royal', 'ruby', 'shiny', 'silver', 'simple',
  'sleepy', 'smart', 'snowy', 'soft', 'solar', 'speedy', 'sunny', 'super', 'sweet', 'swift',
  'tiny', 'vivid', 'warm', 'wild', 'wise', 'young', 'azure', 'breezy', 'cosmic', 'cozy',
  'crispy', 'curly', 'dreamy', 'fluffy', 'frosty', 'fuzzy', 'glossy', 'groovy', 'hazy',
  'icy', 'jazzy', 'lemony', 'mellow', 'misty', 'peachy', 'silky', 'stellar', 'sunny', 'zesty',
];

/** 用户名用英文名词 */
const NOUNS = [
  'fox', 'cat', 'dog', 'bird', 'fish', 'lion', 'tiger', 'bear', 'wolf', 'deer',
  'duck', 'swan', 'owl', 'hawk', 'panda', 'koala', 'otter', 'eagle', 'shark', 'whale',
  'rabbit', 'monkey', 'penguin', 'bee', 'dragon', 'phoenix', 'star', 'moon', 'sun', 'cloud',
  'rain', 'snow', 'wind', 'storm', 'river', 'ocean', 'lake', 'mountain', 'hill', 'valley',
  'forest', 'tree', 'leaf', 'rose', 'lily', 'daisy', 'tulip', 'lotus', 'apple', 'cherry',
  'berry', 'lemon', 'mango', 'melon', 'peach', 'plum', 'stone', 'rock', 'pearl', 'diamond',
  'crystal', 'flame', 'ember', 'spark', 'wave', 'tide', 'breeze', 'frost', 'ice', 'sky',
  'dawn', 'dusk', 'night', 'light', 'shadow', 'echo', 'song', 'note', 'bell', 'drum',
  'flute', 'harp', 'arrow', 'blade', 'shield', 'crown', 'tower', 'castle', 'bridge', 'gate',
  'path', 'road', 'sail', 'anchor', 'compass', 'map', 'book', 'pen', 'ink', 'page',
];

/** 用户名用拼音音节（精选常见音节） */
const SYLLABLES = [
  'an', 'bai', 'ban', 'bao', 'bei', 'bin', 'bing', 'bo', 'cai', 'can', 'cang', 'ce', 'cen',
  'cha', 'chan', 'chang', 'chao', 'che', 'chen', 'cheng', 'chi', 'chuan', 'chuang', 'chui',
  'chun', 'ci', 'cong', 'cu', 'cuan', 'cui', 'cun', 'da', 'dai', 'dan', 'dang', 'dao', 'de',
  'deng', 'di', 'dian', 'diao', 'die', 'ding', 'diu', 'dong', 'dou', 'du', 'duan', 'dui',
  'dun', 'duo', 'fa', 'fan', 'fang', 'fei', 'fen', 'feng', 'fu', 'ga', 'gai', 'gan', 'gang',
  'gao', 'ge', 'gei', 'gen', 'geng', 'gong', 'gou', 'gu', 'gua', 'guai', 'guan', 'guang',
  'gui', 'gun', 'guo', 'ha', 'hai', 'han', 'hang', 'hao', 'he', 'hei', 'hen', 'heng',
  'hong', 'hou', 'hu', 'hua', 'huai', 'huan', 'huang', 'hui', 'hun', 'huo', 'ji', 'jia',
  'jian', 'jiang', 'jiao', 'jie', 'jin', 'jing', 'jiong', 'jiu', 'ju', 'juan', 'jue', 'jun',
  'ka', 'kai', 'kan', 'kang', 'kao', 'ke', 'ken', 'keng', 'kong', 'kou', 'ku', 'kua',
  'kuai', 'kuan', 'kuang', 'kui', 'kun', 'kuo', 'la', 'lai', 'lan', 'lang', 'lao', 'le',
  'lei', 'leng', 'li', 'lian', 'liang', 'liao', 'lie', 'lin', 'ling', 'liu', 'long', 'lou',
  'lu', 'luan', 'lun', 'luo', 'lv', 'ma', 'mai', 'man', 'mang', 'mao', 'me', 'mei', 'men',
  'meng', 'mi', 'mian', 'miao', 'mie', 'min', 'ming', 'miu', 'mo', 'mou', 'mu', 'na',
  'nai', 'nan', 'nang', 'nao', 'ne', 'nei', 'nen', 'neng', 'ni', 'nian', 'niang', 'niao',
  'nie', 'nin', 'ning', 'niu', 'nong', 'nou', 'nu', 'nuan', 'nue', 'nuo', 'nv', 'o', 'ou',
  'pa', 'pai', 'pan', 'pang', 'pao', 'pei', 'pen', 'peng', 'pi', 'pian', 'piao', 'pie',
  'pin', 'ping', 'po', 'pou', 'pu', 'qi', 'qia', 'qian', 'qiang', 'qiao', 'qie', 'qin',
  'qing', 'qiong', 'qiu', 'qu', 'quan', 'que', 'qun', 'ran', 'rang', 'rao', 're', 'ren',
  'reng', 'ri', 'rong', 'rou', 'ru', 'ruan', 'rui', 'run', 'ruo', 'sa', 'sai', 'san',
  'sang', 'sao', 'se', 'sen', 'seng', 'sha', 'shai', 'shan', 'shang', 'shao', 'she',
  'shei', 'shen', 'sheng', 'shi', 'shou', 'shu', 'shua', 'shuai', 'shuan', 'shuang',
  'shui', 'shun', 'shuo', 'si', 'song', 'sou', 'su', 'suan', 'sui', 'sun', 'suo', 'ta',
  'tai', 'tan', 'tang', 'tao', 'te', 'teng', 'ti', 'tian', 'tiao', 'tie', 'ting', 'tong',
  'tou', 'tu', 'tuan', 'tui', 'tun', 'tuo', 'wa', 'wai', 'wan', 'wang', 'wei', 'wen',
  'weng', 'wo', 'wu', 'xi', 'xia', 'xian', 'xiang', 'xiao', 'xie', 'xin', 'xing', 'xiong',
  'xiu', 'xu', 'xuan', 'xue', 'xun', 'ya', 'yan', 'yang', 'yao', 'ye', 'yi', 'yin',
  'ying', 'yo', 'yong', 'you', 'yu', 'yuan', 'yue', 'yun', 'za', 'zai', 'zan', 'zang',
  'zao', 'ze', 'zei', 'zen', 'zeng', 'zha', 'zhai', 'zhan', 'zhang', 'zhao', 'zhe',
  'zhei', 'zhen', 'zheng', 'zhi', 'zhong', 'zhou', 'zhu', 'zhua', 'zhuai', 'zhuan',
  'zhuang', 'zhui', 'zhun', 'zhuo', 'zi', 'zong', 'zou', 'zu', 'zuan', 'zui', 'zun', 'zuo',
];

/** 用户名风格 */
export type EmailStyle = 'word' | 'syllable' | 'letters';
/** 域名模式：常见域名随机 / 自定义 */
export type DomainMode = 'common' | 'custom';

/** 生成结果 */
export type GenEmail = {
  /** 完整邮箱地址 */
  email: string;
  /** 用户名部分 */
  username: string;
  /** 域名部分 */
  domain: string;
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

/** 随机数字后缀：一半概率为出生年风格（1970-2009），否则 2-3 位随机数 */
function randomDigits(): string {
  return Math.random() < 0.5 ? String(randInt(1970, 2009)) : String(randInt(10, 999));
}

/** 生成用户名 */
function randomUsername(style: EmailStyle, withDigits: boolean): string {
  const suffix = withDigits ? randomDigits() : '';
  switch (style) {
    case 'word': {
      // 形容词 + 名词，随机分隔符（. _ 或直接相连）
      const sep = pick(['.', '.', '', '', '_']);
      return `${pick(ADJECTIVES)}${sep}${pick(NOUNS)}${suffix}`;
    }
    case 'syllable': {
      // 2-3 个拼音音节拼接，近似中文名拼音的用户名
      const n = randInt(2, 3);
      let name = '';
      for (let i = 0; i < n; i++) name += pick(SYLLABLES);
      return name + suffix;
    }
    case 'letters': {
      // 5-9 位随机小写字母
      const len = randInt(5, 9);
      let s = '';
      for (let i = 0; i < len; i++) s += String.fromCharCode(randInt(97, 122));
      return s + suffix;
    }
  }
}

/**
 * 生成一个随机邮箱地址
 * @param style {EmailStyle} 用户名风格
 * @param withDigits {boolean} 用户名是否带数字后缀
 * @param domainMode {DomainMode} 域名模式
 * @param customDomain {string} 自定义域名（domainMode 为 custom 时生效）
 */
export function randomEmail(style: EmailStyle, withDigits: boolean, domainMode: DomainMode, customDomain: string): GenEmail {
  const username = randomUsername(style, withDigits);
  const domain = domainMode === 'common' ? pick(DOMAINS) : customDomain.trim().toLowerCase();
  return { email: `${username}@${domain}`, username, domain };
}

/** 校验域名格式（宽松校验，仅拦截明显非法输入） */
export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(domain.trim());
}
