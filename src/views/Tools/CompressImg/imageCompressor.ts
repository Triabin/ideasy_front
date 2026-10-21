/** 图片压缩核心逻辑：基于Canvas在浏览器本地完成，支持质量压缩、缩放、格式转换；内置ZIP打包（Store方式） */

/** 支持的输出格式 */
export type OutputFormat = 'original' | 'image/jpeg' | 'image/webp' | 'image/png';

/** 单张图片的加载信息 */
export type LoadedImage = {
  /** 原文件 */
  file: File;
  /** 原图预览地址（objectURL） */
  srcUrl: string;
  /** 解码后的图片元素 */
  img: HTMLImageElement;
  /** 原始宽度 */
  width: number;
  /** 原始高度 */
  height: number;
};

/** 压缩选项 */
export type CompressOptions = {
  /** 质量（0.1~1，PNG无效） */
  quality: number;
  /** 输出格式 */
  format: OutputFormat;
  /** 是否启用最长边限制缩放 */
  resizeEnabled: boolean;
  /** 最长边像素 */
  maxDimension: number;
  /** 是否启用“压缩到指定大小”模式 */
  targetSizeEnabled: boolean;
  /** 目标最大体积（字节），仅在targetSizeEnabled为true时生效 */
  targetSizeBytes: number;
};

/** 压缩结果 */
export type CompressResult = {
  /** 压缩后的blob */
  blob: Blob;
  /**
   * 压缩后预览地址（objectURL）
   * 注意：本模块内部不会创建该URL，由调用方按需生成并负责释放；
   * 失败结果中为空字符串。
   */
  url: string;
  /** 压缩后宽度 */
  width: number;
  /** 压缩后高度 */
  height: number;
  /** 输出扩展名 */
  ext: string;
  /** 是否已满足目标大小限制（非目标大小模式时为undefined） */
  withinTarget?: boolean;
  /** 实际输出的mime类型（用于判断结果与请求格式是否一致） */
  mime: string;
  /** 失败原因（成功时为undefined） */
  error?: string;
};

/** 扩展名 -> mime类型 */
const EXT_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif',
};

/** mime类型 -> 扩展名 */
const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png',
};

/**
 * 根据文件名获取mime类型
 * @param name {string} 文件名
 */
export function getMimeByName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MIME_MAP[ext] ?? 'application/octet-stream';
}

/**
 * 获取图片实际mime类型（优先使用文件声明的类型，缺失时按扩展名推断）
 * @param file {File} 图片文件
 */
export function getImageMime(file: File): string {
  if (file.type && file.type.startsWith('image/')) return file.type;
  return getMimeByName(file.name);
}

/**
 * 去除扩展名得到基础文件名
 * @param name {string} 文件名
 */
export function getBaseName(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

/**
 * 计算缩放后的尺寸（保持宽高比，最长边不超过max，未启用或无需缩小时返回原尺寸）
 * @param w {number} 原宽
 * @param h {number} 原高
 * @param options {Pick<CompressOptions, 'resizeEnabled' | 'maxDimension'>} 缩放配置
 * @returns {[number, number]} [新宽, 新高]
 */
export function calcScaledSize(w: number, h: number, options: Pick<CompressOptions, 'resizeEnabled' | 'maxDimension'>): [number, number] {
  if (!options.resizeEnabled) return [w, h];
  const max = Math.max(16, Math.trunc(options.maxDimension) || 16);
  const longest = Math.max(w, h);
  if (longest <= max) return [w, h];
  const ratio = max / longest;
  return [Math.max(1, Math.round(w * ratio)), Math.max(1, Math.round(h * ratio))];
}

/**
 * 将图片文件解码为HTMLImageElement并生成预览地址
 * @param file {File} 图片文件
 * @returns {Promise<LoadedImage>} 加载结果
 */
export function loadImageFromFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const srcUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({
      file, srcUrl, img,
      // naturalWidth为0时兜底为1，防止异常文件导致除零
      width: img.naturalWidth || 1,
      height: img.naturalHeight || 1,
    });
    img.onerror = () => {
      URL.revokeObjectURL(srcUrl);
      reject(new Error('图片解码失败'));
    };
    img.src = srcUrl;
  });
}

/**
 * 将图片blob转为png（用于目标格式与浏览器实际编码结果不符时的补救）
 * @param blob {Blob} 源图片blob
 * @returns {Promise<Blob>} png blob
 */
async function convertBlobToPng(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('png转换解码失败'));
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建Canvas上下文');
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('png编码失败')), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 最小缩放比例（目标大小模式下继续缩图的底线，低于此值画质损失过大且收益甚微） */
const MIN_SCALE = 0.15;

/** 单次编码尝试的超时兜底时间（毫秒），防止个别浏览器 toBlob 既不回调也不报错导致任务卡死 */
const ENCODE_TIMEOUT_MS = 20000;

/**
 * 将canvas按指定mime与质量编码为blob
 * @param canvas {HTMLCanvasElement} 画布
 * @param mime {string} 输出mime类型
 * @param quality {number} 编码质量（0~1）
 */
function encodeCanvas(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((res) => {
    let settled = false;
    const done = (b: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      res(b);
    };
    // 兜底：若浏览器未触发toBlob回调，超时后按“编码失败”处理，避免整个批量任务被挂起
    const timer = setTimeout(() => done(null), ENCODE_TIMEOUT_MS);
    try {
      canvas.toBlob((b) => done(b), mime, quality);
    } catch (e) {
      console.error('图片编码异常', e);
      done(null);
    }
  });
}

/**
 * 在固定尺寸下二分搜索满足目标体积的最高质量
 * 每次迭代都会保留“不超过目标体积”的最优结果；若所有质量都超标则返回null（交由缩图处理）
 * @param drawAtSize {() => HTMLCanvasElement} 以当前尺寸绘制画布的回调
 * @param outMime {string} 输出mime类型
 * @param maxQ {number} 允许的最高质量
 * @param targetBytes {number} 目标最大字节数
 */
async function searchQuality(
  drawAtSize: () => HTMLCanvasElement,
  outMime: string,
  maxQ: number,
  targetBytes: number,
): Promise<{ blob: Blob; canvas: HTMLCanvasElement } | null> {
  let lo = 0.05, hi = Math.max(0.05, maxQ);
  let best: { blob: Blob; canvas: HTMLCanvasElement } | null = null;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const canvas = drawAtSize();
    const blob = await encodeCanvas(canvas, outMime, mid);
    if (!blob) throw new Error(`当前浏览器不支持 ${outMime} 编码`);
    if (blob.size <= targetBytes) {
      // 该质量可行，尝试更高质量
      if (!best || blob.size > best.blob.size) best = { blob, canvas };
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 0.01) break;
  }
  return best;
}

/**
 * 压缩单个图片
 * @param loaded {LoadedImage} 已加载的图片
 * @param options {CompressOptions} 压缩选项
 * @returns {Promise<CompressResult>} 压缩结果
 */
export async function compressImage(loaded: LoadedImage, options: CompressOptions): Promise<CompressResult> {
  const srcMime = getImageMime(loaded.file);
  // 确定输出格式：选择“原格式”时gif保持不变（canvas无法编码gif），svg走无损复制
  let outMime: string;
  switch (options.format) {
    case 'image/jpeg':
    case 'image/webp':
    case 'image/png':
      outMime = options.format;
      break;
    default: {
      if (srcMime === 'image/svg+xml') outMime = 'image/svg+xml';
      else if (srcMime === 'image/gif') outMime = 'image/gif';
      else outMime = srcMime === 'image/png' ? 'image/png' : 'image/jpeg';
    }
  }

  // svg / gif 原格式输出：无法通过canvas重编码（会丢失矢量/动画信息），直接复制原文件
  if (outMime === 'image/svg+xml' || outMime === 'image/gif') {
    const blob = loaded.file.slice(0, loaded.file.size, outMime);
    return {
      blob, url: '',
      width: loaded.width, height: loaded.height,
      ext: outMime === 'image/svg+xml' ? 'svg' : 'gif',
      mime: outMime,
      withinTarget: options.targetSizeEnabled ? blob.size <= targetBytesOf(options) : undefined,
    };
  }

  try {
    const [baseW, baseH] = calcScaledSize(loaded.width, loaded.height, options);
    /** 以给定尺寸绘制画布 */
    const drawAt = (w: number, h: number): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建Canvas上下文');
      // jpeg不支持透明，铺白底避免透明区域变黑
      if (outMime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(loaded.img, 0, 0, w, h);
      return canvas;
    };

    const quality = Math.min(1, Math.max(0.1, options.quality));
    let w = baseW, h = baseH;
    let blob: Blob | null = null;
    let withinTarget: boolean | undefined;

    if (options.targetSizeEnabled) {
      // “压缩到指定大小”模式：忽略质量滑块，先二分质量，仍超标则逐步缩小尺寸再二分质量
      const targetBytes = Math.max(1024, Math.trunc(options.targetSizeBytes) || 1024);
      const isLossless = outMime === 'image/png';
      let best: { blob: Blob; canvas: HTMLCanvasElement } | null = null;

      for (let round = 0; round < 7 && !best; round++) {
        const curW = w, curH = h;
        const found = await searchQuality(
          () => drawAt(curW, curH),
          outMime,
          isLossless ? 1 : 0.95,
          targetBytes,
        );
        if (found) {
          best = found;
          break;
        }
        // 无损格式或最低质量仍超标：缩小尺寸后重试
        const nextW = Math.max(16, Math.round(w * 0.8));
        const nextH = Math.max(16, Math.round(h * 0.8));
        if (nextW / loaded.width < MIN_SCALE && nextH / loaded.height < MIN_SCALE) break;
        w = nextW;
        h = nextH;
      }

      if (best) {
        blob = best.blob;
        // 用最优结果对应的尺寸重新取宽高（best.canvas即最终画布）
        w = best.canvas.width;
        h = best.canvas.height;
        withinTarget = true;
      } else {
        // 已到极限仍无法达标：输出能找到的最小体积（最低质量+最小尺寸），如实标记未达标
        const minQ = isLossless ? 1 : 0.3;
        const fallback = await encodeCanvas(drawAt(w, h), outMime, minQ);
        if (!fallback) throw new Error(`当前浏览器不支持 ${outMime} 编码`);
        blob = fallback;
        withinTarget = false;
      }
    } else {
      const canvas = drawAt(w, h);
      blob = await encodeCanvas(canvas, outMime, quality);
      if (!blob) throw new Error(`当前浏览器不支持 ${outMime} 编码`);
    }

    // 若指定格式浏览器编码结果与请求不符（如旧版浏览器webp->png），尝试补救转换
    let finalMime = outMime;
    if (options.format !== 'original' && blob.type !== outMime) {
      if (outMime === 'image/png') blob = await convertBlobToPng(blob);
      else finalMime = blob.type || outMime;
    }

    return {
      blob, url: '', width: w, height: h,
      ext: MIME_EXT_MAP[finalMime] ?? 'img',
      mime: finalMime,
      withinTarget,
    };
  } catch (e) {
    return {
      blob: new Blob([]), url: '', width: 0, height: 0, ext: '', mime: '',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * 从选项中取出目标字节数（兜底最小1KB）
 * @param options {CompressOptions} 压缩选项
 */
function targetBytesOf(options: CompressOptions): number {
  return Math.max(1024, Math.trunc(options.targetSizeBytes) || 1024);
}

/**
 * 下载blob为文件
 * @param blob {Blob} 要下载的数据
 * @param fileName {string} 文件名
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================ ZIP 打包（无第三方依赖） ============================

/** CRC32查表 */
const CRC_TABLE: number[] = (() => {
  const table: number[] = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * 计算字节流的CRC32
 * @param data {Uint8Array} 字节数据
 */
function crc32(data: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** ZIP条目（data使用Blob类型，规避TS新版lib中Uint8Array<ArrayBufferLike>与BlobPart的兼容性问题） */
type ZipEntry = { name: string; data: Blob };

/**
 * 将多个文件打包为ZIP（Store方式，不压缩——图片本身已是高压缩比格式，deflate收益极低且需引入额外算法）
 * @param entries {ZipEntry[]} 文件名与内容列表
 * @returns {Promise<Blob>} zip blob
 */
async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const chunks: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  // DOS时间（固定当前时间即可，无需精确）
  const d = new Date();
  const dosTime = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
  const dosDate = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;

  /** 小端序u32/u16写入辅助 */
  const u32 = (v: number) => new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]);
  const u16 = (v: number) => new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF]);

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const bytes = new Uint8Array(await entry.data.arrayBuffer() as ArrayBuffer);
    const crc = crc32(bytes);
    const size = bytes.length;
    // 本地文件头
    chunks.push(
      new Uint8Array([0x50, 0x4B, 0x03, 0x04]), // signature
      u16(20), u16(0x0800), u16(0),             // version needed / flags(UTF-8 name) / method=store
      u16(dosTime), u16(dosDate),
      u32(crc), u32(size), u32(size),
      u16(nameBytes.length), u16(0),
      nameBytes,
      bytes,
    );
    // 中央目录记录（字段序：verMade verNeed flags method time date crc csize usize nlen elen clen disk iattr xattr offset）
    central.push(
      new Uint8Array([0x50, 0x4B, 0x01, 0x02]), // signature
      u16(20),                                  // version made by
      u16(20),                                  // version needed
      u16(0x0800),                              // flags: UTF-8文件名
      u16(0),                                   // method: store
      u16(dosTime), u16(dosDate),
      u32(crc), u32(size), u32(size),
      u16(nameBytes.length),                    // filename length
      u16(0),                                   // extra field length
      u16(0),                                   // file comment length
      u16(0),                                   // disk number start
      u16(0),                                   // internal attributes
      u32(0),                                   // external attributes
      u32(offset),                              // local header offset
      nameBytes,
    );
    offset += 30 + nameBytes.length + size;
  }

  const centralSize = central.reduce((s, p) => s + (p as Uint8Array).length, 0);
  const end = [
    new Uint8Array([0x50, 0x4B, 0x05, 0x06]), // EOCD signature
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralSize), u32(offset),
    u16(0),
  ];
  return new Blob([...chunks, ...central, ...end], { type: 'application/zip' });
}

/**
 * 批量下载：将多个blob打包成一个ZIP统一下载（避免浏览器逐个触发下载时被拦截/只保存第一张）
 * 单张时直接下载原文件，不打包装。
 * @param files {{blob: Blob; name: string}[]} 待下载文件列表
 * @param zipName {string} 压缩包文件名（不含.zip后缀）
 */
export async function downloadAsZip(files: { blob: Blob; name: string }[], zipName: string): Promise<void> {
  if (!files.length) return;
  if (files.length === 1) {
    downloadBlob(files[0].blob, files[0].name);
    return;
  }
  // 重名文件自动追加序号，保证ZIP内文件名唯一
  const used = new Map<string, number>();
  const entries: ZipEntry[] = [];
  for (const f of files) {
    let name = f.name;
    const count = used.get(name.toLowerCase());
    if (count !== undefined) {
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      used.set(name.toLowerCase(), count + 1);
      name = `${base}(${count + 1})${ext}`;
    } else {
      used.set(name.toLowerCase(), 1);
    }
    entries.push({ name, data: f.blob });
  }
  const zip = await createZip(entries);
  downloadBlob(zip, `${zipName}.zip`);
}
