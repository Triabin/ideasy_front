import QRCode from 'qrcode';

/** 二维码生成可选的错误纠正等级 */
export const ERROR_CORRECTION_LEVELS = [
  { value: 'L', label: 'L (7%)', desc: '约可修复7%的码字错误，密度最高，适合内容较长、印刷质量好的场景' },
  { value: 'M', label: 'M (15%)', desc: '约可修复15%的码字错误，默认等级，兼顾容量与容错' },
  { value: 'Q', label: 'Q (25%)', desc: '约可修复25%的码字错误，适合可能有轻微污损的场景' },
  { value: 'H', label: 'H (30%)', desc: '约可修复30%的码字错误，容错最强，适合叠加Logo的场景' },
] as const;

export type ErrorCorrectionLevel = (typeof ERROR_CORRECTION_LEVELS)[number]['value'];

/** 输出尺寸选项（px） */
export const SIZE_OPTIONS = [128, 256, 512, 1024] as const;

/** 常用快捷类型 */
export type QuickType = 'text' | 'url' | 'wifi' | 'tel' | 'sms' | 'email' | 'geo';

export const QUICK_TYPES: { value: QuickType; label: string }[] = [
  { value: 'text', label: '文本' },
  { value: 'url', label: '网址' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'tel', label: '电话' },
  { value: 'sms', label: '短信' },
  { value: 'email', label: '邮箱' },
  { value: 'geo', label: '位置' },
];

/** Wi-Fi 加密方式 */
export const WIFI_ENCRYPTIONS = [
  { value: 'WPA', label: 'WPA/WPA2' },
  { value: 'nopass', label: '无密码' },
  { value: 'WEP', label: 'WEP' },
] as const;

/**
 * 转义Wi-Fi配置中的特殊字符（\ ; , : "）
 * @param str {string} 原始字符串
 */
export function escapeWifiValue(str: string): string {
  return str.replace(/([\\;,:"])/g, '\\$1');
}

/**
 * 构建Wi-Fi配置的MECARD风格字符串
 * @param ssid {string} 网络名称
 * @param password {string} 密码
 * @param encryption {'WPA' | 'nopass' | 'WEP'} 加密方式
 * @param hidden {boolean} 是否为隐藏网络
 */
export function buildWifiString(
  ssid: string,
  password: string,
  encryption: 'WPA' | 'nopass' | 'WEP',
  hidden: boolean
): string {
  let str = `WIFI:T:${encryption};`;
  if (ssid) str += `S:${escapeWifiValue(ssid)};`;
  if (encryption !== 'nopass' && password) str += `P:${escapeWifiValue(password)};`;
  if (hidden) str += 'H:true;';
  return str + ';';
}

/** 二维码生成参数 */
export interface QrOptions {
  /** 边距（单位为模块数） */
  margin: number;
  /** 输出宽度（px） */
  width: number;
  /** 错误纠正等级 */
  ecLevel: ErrorCorrectionLevel;
  /** 前景色（支持透明后缀，如 #000000FF） */
  darkColor: string;
  /** 背景色（支持透明后缀） */
  lightColor: string;
}

/**
 * 将 #RRGGBB 颜色与透明度(0-100)合成为qrcode库需要的 #RRGGBBAA 格式
 * @param hex {string} #RRGGBB
 * @param alpha {number} 不透明度百分比 0-100
 */
export function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 100) / 100 * 255);
  return `${hex}${a.toString(16).padStart(2, '0').toUpperCase()}`;
}

/**
 * 生成二维码SVG字符串
 * @param text {string} 要编码的内容
 * @param options {QrOptions} 生成参数
 * @returns {Promise<string>} SVG字符串
 */
export function generateSvg(text: string, options: QrOptions): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: options.ecLevel,
    margin: options.margin,
    width: options.width,
    color: {
      dark: options.darkColor,
      light: options.lightColor,
    },
  });
}

/**
 * 生成二维码PNG的dataURL
 * @param text {string} 要编码的内容
 * @param options {QrOptions} 生成参数
 * @returns {Promise<string>} data:image/png;base64,...
 */
export function generatePngDataURL(text: string, options: QrOptions): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: options.ecLevel,
    margin: options.margin,
    width: options.width,
    color: {
      dark: options.darkColor,
      light: options.lightColor,
    },
  });
}

/**
 * 下载base64图片
 * @param dataURL {string} 图片dataURL
 * @param fileName {string} 文件名
 */
export function downloadDataURL(dataURL: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = fileName;
  link.click();
}

/**
 * 下载SVG文本
 * @param svg {string} SVG字符串
 * @param fileName {string} 文件名
 */
export function downloadSVG(svg: string, fileName: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
