import opentype from 'opentype.js';

/** 数学工具类 */
export const MyMathUtils = {
  /**
   * 函数描述：获取指定区间的随机整数
   * @param min {number} 最小值
   * @param max {number} 最大值
   * @return { number } 符合条件的随机整数
   */
  randomInt: (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min,

  /**
   * 函数描述：在坐标系上计算从距离指定位置指定距离且指定角度点的坐标
   * @param distance {number} 指定距离
   * @param rad {number} 指定角度的弧度值
   * @param from { {x: number, y: number} } 起始坐标数组，from.x：横坐标、from.y：纵坐标
   * @return { {x: number, y: number} } 目标地点坐标，dest.x：横坐标、dest.y：纵坐标
   */
  computeCoordinates: (distance: number, rad: number, from: { x: number, y: number }): { x: number, y: number } => {
    from = from || {x: 0, y: 0};
    return {
      x: from.x + distance * Math.cos(rad),
      y: from.y + distance * Math.sin(rad)
    };
  }
};

/**
 * 获取当前操作系统类型
 * @returns { 'Android' | 'iOS' | 'Windows' | 'MacOS' | 'Linux' | 'Unknown' } 操作系统类型
 */
export function getOS(): 'Android' | 'iOS' | 'Windows' | 'MacOS' | 'Linux' | 'Unknown' {
  const userAgent = navigator.userAgent;
  if (/Win/i.test(userAgent)) return 'Windows';
  if (/Mac/i.test(userAgent)) return 'MacOS';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iPad|iPhone|iPod/.test(userAgent)) return 'iOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Unknown';
}

/**
 * 防抖函数
 * @param func {Function} 要防抖的函数
 * @param wait {number} 防抖时间，单位：毫秒，默认300
 * @returns {Function} 防抖后的函数
 * @warning 函数必须满足“需要频繁触发”、“耗时操作”、“只关心最终结果（不关心过程）”三个条件才适合使用防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number = 300): T {
  let timerId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: Parameters<T>) {
    // 取消之前的等待
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      // 调用函数并透传参数与this
      func.call(this, ...args)
    }, wait);
  } as T;
}

/**
 * 函数功能：指定字符串点击下载成为指定文件
 * @param content {string} 要生成文件内容
 * @param mimeType {string} 文件mime类型，详情查询：https://www.runoob.com/http/mime-types.html
 * @param nameGetter {() => string} 获取文件名称的函数，默认返回“文件名”
 * @param charset {string} 字符集
 */
export const clickDownload = (
  content: string,
  mimeType: string,
  nameGetter: () => string = () => '文件名',
  charset: string = 'utf-8'
) => {
  const blob = new Blob([content], {type: `${mimeType};${charset}`});
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a');
  link.href = url;
  link.download = nameGetter();
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 通过字体文件获取字体font-family（英文有限、中文次之）
 * @param file {File} 字体文件
 * @returns {string} 字体家族名
 */
export async function getFontFamilyFromFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const font = opentype.parse(buf)
  const names = font.names as any;
  if (!names) return '';
  const familyMeta: Record<string, string> = names.preferredFamily
    || names.fontFamily
    || names.windows?.fontFamily
    || names.macintosh?.fontFamily
    || {};
  // 优先取英文 family 名
  return familyMeta.en || familyMeta.zh || Object.values(familyMeta)[0] || '';
}

/**
 * 通过字体文件获取所有字体font-family
 * @param file {File} 字体文件
 * @returns {Record<string, string>} 所有字体家族名
 */
export async function getFontFamiliesFromFile(file: File): Promise<Record<string, string>> {
  const buf = await file.arrayBuffer()
  const font = opentype.parse(buf)
  const names = font.names as any;
  return names.preferredFamily
    || names.fontFamily
    || names.windows?.fontFamily
    || names.macintosh?.fontFamily
    || {};
}

/**
 * 复制文本到剪切板
 * @param text {string} 要复制的文本
 */
export async function copyText(text: string): Promise<void> {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    (document as any).execCommand('copy');
    ta.remove();
  }
}

/**
 * 提示信息弹窗
 * @param content {string} 提示内容（可以是HTML字符串）
 * @param type 弹窗类型，默认none
 * @param duration 弹窗持续时间（默认3000，单位毫秒）
 * @param horizontalPos 水平位置，默认center
 * @param verticalPos 垂直位置，默认center
 */
export const popupTip = (
  content: string,
  type: 'none' | 'success' | 'warning' | 'error' | 'dash' = 'none',
  duration: number = 3000,
  horizontalPos: 'start' | 'center' | 'end' = 'center',
  verticalPos: 'top' | 'middle' | 'bottom' = 'middle'
) => {
  let typeClass = '';
  switch (type) {
    case 'none':
      typeClass = '';
      break;
    case 'success':
      typeClass = 'alert-success';
      break;
    case 'warning':
      typeClass = 'alert-warning';
      break;
    case 'error':
      typeClass = 'alert-error';
      break;
    case 'dash':
      typeClass = 'alert-dash';
      break;
  }
  const tipElement = document.createElement('div');
  tipElement.classList.add('toast', `toast-${verticalPos}`, `toast-${horizontalPos}`);
  tipElement.innerHTML = `<div class="alert ${typeClass}">${content}</div>`;
  document.body.appendChild(tipElement);
  setTimeout(() => {
    document.body.removeChild(tipElement);
  }, duration);
}
