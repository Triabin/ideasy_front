/**
 * 图片格式转换核心逻辑
 * - 目标编码：JPG/PNG/WebP 走 Canvas toBlob（能力运行时探测），BMP 为内置的未压缩 24bit 编码器
 * - 源解码：常规图片走浏览器 <img>，RAW 走 dcraw（见 rawLoader.ts）
 * - RAW 只能作为输入：RAW 是传感器原始数据（未去马赛克的拜耳阵列 + 完整位深 + 相机元数据），
 *   JPG/PNG 等转换结果已丢失这些信息，无法无损还原，因此不提供「转换为 RAW」
 */

/** 目标输出格式 */
export type TargetFormat = 'jpeg' | 'png' | 'webp' | 'bmp';

/** 像素数据（与 ImageData 结构一致，用普通对象便于纯逻辑复用与测试） */
export type PixelData = {
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
};

/** 格式元信息 */
export type FormatMeta = {
  value: TargetFormat;
  label: string;
  mime: string;
  ext: string;
  /** 有损编码（可调质量） */
  lossy: boolean;
  /** 支持透明通道 */
  alpha: boolean;
  note: string;
};

/** 支持的目标格式（RAW 与 AVIF 仅可作为输入，见文件头注释与 TargetFormat 说明） */
export const FORMATS: FormatMeta[] = [
  { value: 'jpeg', label: 'JPG', mime: 'image/jpeg', ext: '.jpg', lossy: true, alpha: false, note: '有损压缩，不支持透明，透明区域以填充色补齐' },
  { value: 'png', label: 'PNG', mime: 'image/png', ext: '.png', lossy: false, alpha: true, note: '无损压缩，支持透明' },
  { value: 'webp', label: 'WebP', mime: 'image/webp', ext: '.webp', lossy: true, alpha: true, note: '支持透明与有损压缩，体积通常小于 JPG' },
  { value: 'bmp', label: 'BMP', mime: 'image/bmp', ext: '.bmp', lossy: false, alpha: false, note: '无压缩位图，体积大，不支持透明' },
];

/** 常见 RAW 格式扩展名 */
export const RAW_EXTS = [
  'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'dng', 'raf', 'orf',
  'rw2', 'pef', 'raw', 'bay', '3fr', 'dcr', 'kdc', 'mrw', 'x3f', 'iiq',
  'gpr', 'erf', 'mdc', 'cs1', 'rwl', 'srw',
];

/** 获取文件扩展名（小写、不含点） */
export function getExt(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

/** 是否 RAW 文件（按扩展名或 MIME 判断） */
export function isRawFile(file: File): boolean {
  if (RAW_EXTS.includes(getExt(file.name))) return true;
  const type = file.type.toLowerCase();
  return type.includes('raw') || type === 'image/x-canon-cr2' || type === 'image/x-nikon-nef'
      || type === 'image/x-sony-arw' || type === 'image/x-adobe-dng' || type === 'image/x-fuji-raf';
}

/** 源文件的格式展示标签 */
export function srcLabelOf(file: File): string {
  const ext = getExt(file.name);
  if (ext) return ext.toUpperCase().replace('JPEG', 'JPG').replace('TIFF', 'TIF');
  const sub = file.type.split('/')[1];
  return sub ? sub.toUpperCase() : '图片';
}

/** 探测当前浏览器对各目标格式的 Canvas 编码支持（BMP 为内置编码器恒可用） */
export async function detectEncoders(): Promise<Record<TargetFormat, boolean>> {
  const support = (mime: string): Promise<boolean> => new Promise(resolve => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      canvas.toBlob(blob => resolve(!!blob && blob.type === mime), mime, 0.8);
    } catch {
      resolve(false);
    }
  });
  const result = {} as Record<TargetFormat, boolean>;
  await Promise.all(FORMATS.map(async f => {
    result[f.value] = f.value === 'bmp' ? true : await support(f.mime);
  }));
  return result;
}

/**
 * 解析 PPM(P6 二进制 RGB) 为像素数据
 * dcraw 默认输出 8bit sRGB 的 P6 格式；头部允许 # 注释与任意空白分隔
 * @param bytes {Uint8Array} PPM 文件内容
 */
export function parsePpm(bytes: Uint8Array): PixelData {
  let pos = 0;
  const readToken = (): string => {
    // 跳过空白与 # 行注释
    for (;;) {
      while (pos < bytes.length && bytes[pos] <= 0x20) pos++;
      if (pos < bytes.length && bytes[pos] === 0x23) {
        while (pos < bytes.length && bytes[pos] !== 0x0a) pos++;
        continue;
      }
      break;
    }
    const start = pos;
    while (pos < bytes.length && bytes[pos] > 0x20) pos++;
    if (start === pos) throw new Error('PPM 数据意外结束');
    let s = '';
    for (let i = start; i < pos; i++) s += String.fromCharCode(bytes[i]);
    return s;
  };

  const magic = readToken();
  if (magic !== 'P6') throw new Error(`不支持的 PPM 变体 ${magic}（仅支持 P6）`);
  const width = parseInt(readToken(), 10);
  const height = parseInt(readToken(), 10);
  const maxval = parseInt(readToken(), 10);
  if (!(width > 0 && height > 0)) throw new Error('PPM 尺寸非法');
  if (maxval !== 255) throw new Error(`不支持的 PPM 位深（maxval=${maxval}，仅支持 255）`);
  // maxval 之后到第一个换行符为止是头部结束（兼容 \r\n）
  while (pos < bytes.length && bytes[pos] !== 0x0a) pos++;
  pos++;
  const need = width * height * 3;
  if (bytes.length - pos < need) throw new Error('PPM 像素数据不完整');

  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, p = pos; i < data.length; i += 4, p += 3) {
    data[i] = bytes[p];
    data[i + 1] = bytes[p + 1];
    data[i + 2] = bytes[p + 2];
    data[i + 3] = 255;
  }
  return { data, width, height };
}

/**
 * 将像素数据编码为 24bit 未压缩 BMP（不含 alpha，调用前需先完成透明合成）
 * @param img {PixelData} 像素数据
 */
export function encodeBmp(img: PixelData): Blob {
  const { width, height, data } = img;
  // 每行字节数需补齐到 4 的倍数
  const rowSize = Math.ceil(width * 3 / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);

  // BITMAPFILEHEADER（14 字节）
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true); // 像素数据偏移
  // BITMAPINFOHEADER（40 字节）
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // 正数 = 自底向上存储
  view.setUint16(26, 1, true); // 色彩平面数
  view.setUint16(28, 24, true); // 位深
  view.setUint32(30, 0, true); // BI_RGB 无压缩
  view.setUint32(34, pixelDataSize, true);
  view.setUint32(38, 2835, true); // 水平分辨率 72dpi
  view.setUint32(42, 2835, true); // 垂直分辨率

  // 像素区：自底向上、BGR 顺序
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      view.setUint8(offset++, data[i + 2]); // B
      view.setUint8(offset++, data[i + 1]); // G
      view.setUint8(offset++, data[i]); // R
    }
    offset += rowSize - width * 3; // 行尾补齐（ArrayBuffer 初始为 0）
  }
  return new Blob([buf], { type: 'image/bmp' });
}

/** 转换选项 */
export type ConvertOptions = {
  /** 目标格式 */
  target: TargetFormat;
  /** 有损格式的质量（0-1） */
  quality: number;
  /** 目标格式不支持透明时，透明区域的填充色（CSS 颜色） */
  bgColor: string;
};

/** 转换结果 */
export type ConvertResult = {
  blob: Blob;
  width: number;
  height: number;
  ext: string;
  mime: string;
};

/** Canvas toBlob 的 Promise 封装 */
function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas 编码失败')), mime, quality);
  });
}

/**
 * 将解码后的图片（<img> 或像素数据）编码为目标格式
 * @param source {PixelData | HTMLImageElement} 解码结果
 * @param opts {ConvertOptions} 目标格式与质量等选项
 */
export async function convertToFormat(source: PixelData | HTMLImageElement, opts: ConvertOptions): Promise<ConvertResult> {
  const meta = FORMATS.find(f => f.value === opts.target);
  if (!meta) throw new Error(`未知的目标格式 ${opts.target}`);
  const isImg = source instanceof HTMLImageElement;
  const w = isImg ? (source.naturalWidth || 0) : source.width;
  const h = isImg ? (source.naturalHeight || 0) : source.height;
  if (!w || !h) throw new Error('图片尺寸非法，无法转换');

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: opts.target === 'bmp' });
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');

  // 目标格式不支持透明：先铺填充色，绘制时透明区域自动合成到该颜色上
  if (!meta.alpha) {
    ctx.fillStyle = opts.bgColor;
    ctx.fillRect(0, 0, w, h);
  }
  if (isImg) {
    ctx.drawImage(source, 0, 0);
  } else {
    // 像素数据先放入临时画布，再用 drawImage 合成，保证与 <img> 路径的透明处理一致
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    if (!tctx) throw new Error('无法创建 Canvas 2D 上下文');
    tctx.putImageData(new ImageData(source.data, w, h), 0, 0);
    ctx.drawImage(tmp, 0, 0);
  }

  let blob: Blob;
  if (opts.target === 'bmp') {
    blob = encodeBmp(ctx.getImageData(0, 0, w, h));
  } else {
    blob = await canvasToBlob(canvas, meta.mime, meta.lossy ? opts.quality : undefined);
    if (blob.type !== meta.mime) {
      throw new Error(`当前浏览器不支持 ${meta.label} 编码（实际输出 ${blob.type || '未知'}）`);
    }
  }
  return { blob, width: w, height: h, ext: meta.ext, mime: meta.mime };
}
