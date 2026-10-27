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

/** 文件工具 */
export const MyFileUtils = {
  /** 常见扩展名 → MIME 类型映射（当 File.type 为空时兜底） */
  EXT_MIME_MAP: {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif', tiff: 'image/tiff',
    mp4: 'video/mp4', webm: 'video/webm', ogg: 'audio/ogg', m4a: 'audio/mp4', mp3: 'audio/mpeg',
    wav: 'audio/wav', flac: 'audio/flac', aac: 'audio/aac', opus: 'audio/opus',
    pdf: 'application/pdf', zip: 'application/zip', gz: 'application/gzip', rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed', tar: 'application/x-tar',
    json: 'application/json', xml: 'application/xml', txt: 'text/plain', md: 'text/markdown',
    csv: 'text/csv', html: 'text/html', css: 'text/css', js: 'text/javascript',
    wasm: 'application/wasm', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  } as Record<string, string>,

  /**
   * 获取文件mimetype
   * @param file {File} 文件对象
   */
  getMimeType: function (file: File): string {
    if (file.type) return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return this.EXT_MIME_MAP[ext] ?? 'application/octet-stream';
  },

  /**
   * 将 ArrayBuffer分块转成base64（避免String.fromCharCode一次性展开超长参数列表导致栈溢出）
   * @param buffer {ArrayBuffer} 二进制数据
   */
  bufferToBase64: function (buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const CHUNK = 0x8000; // 32KB 一块
    const parts: string[] = [];
    for (let i = 0; i < bytes.length; i += CHUNK) {
      parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
    }
    return btoa(parts.join(''));
  },

  /**
   * 分块读取超大文件的兜底方案：先尝试FileReader，失败后按切片逐块base64再拼接
   * @param file {File} 要读取的文件对象
   * @returns {string} base64字符串
   */
  readByChunks: async function (file: File): Promise<string> {
    // 每片大小必须是 3 的倍数（base64 以 3 字节为一组编码），否则分块结果无法直接拼接；
    // 取 999K（333*3*1024，可被 3 整除）近似 1MB
    const CHUNK_SIZE = 333 * 3 * 1024;
    const parts: string[] = [];
    for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
      const blob = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size));
      const buf = await blob.arrayBuffer();
      parts.push(this.bufferToBase64(buf));
    }
    return parts.join('');
  },

  /**
   * 使用FileReader读取文件并转换为DataURI
   * @param file
   */
  readByFileReader2URI: function (file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * 格式化字节长度单位（B/KB/MB/GB/TB/PB/EB/ZB/YB）
   * @param byteLen {number} 字节数量
   * @param decimal {number} 保留的小数位数，默认2
   * @param space {boolean} 单位与数字之间是否有空格，默认true
   */
  fmtByteSize: function (byteLen: number, decimal: number = 2, space: boolean = true): string {
    if (byteLen < 0) {
      throw new Error('byteLen must be non-negative');
    }
    const sep = space ? ' ' : '';
    if (byteLen === 0) {
      return `0${sep}B`;
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const unitIndex = Math.floor(Math.log(byteLen) / Math.log(1024));
    const clampedIndex = Math.min(unitIndex, units.length - 1);
    const value = byteLen / Math.pow(1024, clampedIndex);
    return `${value.toFixed(decimal)}${sep}${units[clampedIndex]}`;
  },

  /**
   * 将文件转换为Base64DataURI。FileReader失败时自动降级为分块读取
   * @param file {File} 目标文件
   * @param onProgress {(ratio:number)=>void} 进度回调（0~1）
   * @return {Promise<[string, string]>} 转换结果[DataURI, mimetype]
   */
  fileToBase64URI: async function (
    file: File,
    onProgress?: (ratio: number) => void
  ): Promise<[string, string]> {
    const mimeType = this.getMimeType(file);
    onProgress?.(0.05);
    try {
      const uri = await this.readByFileReader2URI(file);
      onProgress?.(1);
      return [uri, mimeType];
    } catch (e) {
      // FileReader 对超大文件可能因内存限制失败，降级为分块读取
      console.warn('FileReader读取失败，尝试分块读取', e);
      onProgress?.(0.4);
      const base64 = await this.readByChunks(file);
      const uri = `data:${mimeType};base64,${base64}`;
      onProgress?.(1);
      return [uri, mimeType];
    }
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
): void => {
  // 一定要全类名，不然构建的时候不会将tailwindcss/daisyUI类名的样式打包进去
  const types = { none: '', success: 'alert-success', warning: 'alert-warning', error: 'alert-danger', dash: 'alert-danger' };
  const horis = { start: 'toast-start', center: 'toast-center', end: 'toast-end' };
  const verts = { top: 'toast-top', middle: 'toast-middle', bottom: 'toast-bottom' };
  const popupTip = document.getElementById('popup-tip');
  if (!popupTip) return;
  popupTip.className = `toast ${horis[horizontalPos]} ${verts[verticalPos]}`;
  const alert = document.createElement('div');
  alert.className = `alert ${types[type]}`.trim();
  alert.innerHTML = content;
  popupTip.appendChild(alert);
  setTimeout(() => {
    popupTip.removeChild(alert);
    if (!popupTip.innerHTML) popupTip.removeAttribute('class');
  }, duration);
}
