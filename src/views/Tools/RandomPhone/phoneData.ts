/**
 * 随机手机号生成：按运营商真实号段前缀生成 11 位大陆手机号
 * 仅用于测试数据填充；生成结果纯属随机，可能与真实号码巧合重合，请勿用于骚扰等非法用途。
 */

/** 运营商 */
export type Carrier = 'mobile' | 'unicom' | 'telecom' | 'virtual';

/** 运营商显示名 */
export const CARRIER_LABELS: Record<Carrier, string> = {
  mobile: '中国移动',
  unicom: '中国联通',
  telecom: '中国电信',
  virtual: '虚拟运营商',
};

/** 运营商徽章样式（类名写全，保证被 Tailwind 打进样式包） */
export const CARRIER_BADGES: Record<Carrier, string> = {
  mobile: 'badge-soft badge-primary border-transparent',
  unicom: 'badge-soft badge-error border-transparent',
  telecom: 'badge-soft badge-info border-transparent',
  virtual: 'badge-soft badge-accent border-transparent',
};

/** 各运营商常见号段前缀（参考公开号段资料整理，可能滞后于实际放号） */
export const PREFIXES: Record<Carrier, string[]> = {
  mobile: [
    '134', '135', '136', '137', '138', '139', '147', '148', '150', '151', '152',
    '157', '158', '159', '172', '178', '182', '183', '184', '187', '188', '195', '197', '198',
  ],
  unicom: [
    '130', '131', '132', '145', '146', '155', '156', '166', '175', '176', '185', '186', '196',
  ],
  telecom: [
    '133', '149', '153', '173', '174', '177', '180', '181', '189', '190', '191', '193', '199',
  ],
  virtual: ['162', '165', '167', '170', '171'],
};

/** 号码显示格式 */
export type PhoneFormat = 'plain' | 'spaced' | 'masked';

/** 生成结果 */
export type GenPhone = {
  /** 11 位纯数字号码 */
  raw: string;
  /** 号段前缀 */
  prefix: string;
  /** 归属运营商 */
  carrier: Carrier;
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * 按显示格式渲染号码
 * @param raw {string} 11 位纯数字号码
 * @param format {PhoneFormat} plain 连续 / spaced 3-4-4 分隔 / masked 隐藏中间四位
 */
export function formatPhone(raw: string, format: PhoneFormat): string {
  switch (format) {
    case 'spaced':
      return `${raw.slice(0, 3)} ${raw.slice(3, 7)} ${raw.slice(7)}`;
    case 'masked':
      return `${raw.slice(0, 3)}****${raw.slice(7)}`;
    default:
      return raw;
  }
}

/**
 * 生成一个随机手机号
 * @param carrier {Carrier | 'any'} 指定运营商，any 时在全部号段中随机
 */
export function randomPhone(carrier: Carrier | 'any'): GenPhone {
  const c: Carrier = carrier === 'any'
      ? pick(['mobile', 'unicom', 'telecom', 'virtual'] as Carrier[])
      : carrier;
  const prefix = pick(PREFIXES[c]);
  let tail = '';
  for (let i = 0; i < 8; i++) tail += Math.floor(Math.random() * 10);
  return { raw: prefix + tail, prefix, carrier: c };
}
