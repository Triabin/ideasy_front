/**
 * 图片取色盘核心逻辑：Canvas 像素扫描 + 15 位色彩量化统计。
 * 类似 colorthief，但保留每种颜色的精确像素数量：
 * 先按每通道 5bit 分桶计数（32768 桶），再按像素数加权合并相近颜色，得到主色盘。
 */
import { formatHex } from '../ColorCvter/colorConverter.ts';

/** 采样最长边（像素）：超大图先等比缩小再统计，兼顾精度与性能 */
export const MAX_SAMPLE_EDGE = 512;

/** 每通道量化右移位数（8bit → 5bit） */
const SHIFT = 3;

/** 相近颜色合并阈值：RGB 欧氏距离 ≤ 40 视为同一配色 */
const MERGE_DIST_SQ = 40 * 40;

/** 像素统计桶（大数组，不要放入深响应式） */
export type ColorBuckets = {
  /** 参与统计的不透明像素数 */
  opaquePixels: number;
  /** 被跳过的（近）透明像素数 */
  transparentPixels: number;
  /** 量化后的不同颜色数 */
  uniqueColors: number;
  /** 每个色桶的像素数，索引 = (r>>3)<<10 | (g>>3)<<5 | (b>>3) */
  counts: Int32Array;
  /** 每个色桶内真实 r/g/b 分量之和（用于加权平均，避免量化偏差） */
  rSum: Float64Array;
  gSum: Float64Array;
  bSum: Float64Array;
};

/** 色盘条目 */
export type PaletteColor = {
  r: number;
  g: number;
  b: number;
  /** #RRGGBB（大写） */
  hex: string;
  /** 像素数量（采样范围内） */
  count: number;
  /** 占不透明像素的百分比，0-100 */
  percent: number;
};

/**
 * 将图片等比缩放到采样尺寸并读取像素
 * @param img {HTMLImageElement} 已解码的图片元素
 * @param maxEdge {number} 采样最长边
 */
export function sampleImage(img: HTMLImageElement, maxEdge: number = MAX_SAMPLE_EDGE): ImageData {
  const w = img.naturalWidth || 1;
  const h = img.naturalHeight || 1;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.drawImage(img, 0, 0, sw, sh);
  return ctx.getImageData(0, 0, sw, sh);
}

/**
 * 扫描像素，按量化色桶计数
 * @param data {ImageData} 采样像素数据
 */
export function buildBuckets(data: ImageData): ColorBuckets {
  const size = 1 << 15;
  const counts = new Int32Array(size);
  const rSum = new Float64Array(size);
  const gSum = new Float64Array(size);
  const bSum = new Float64Array(size);
  const px = data.data;
  let opaquePixels = 0;
  let transparentPixels = 0;
  for (let i = 0; i < px.length; i += 4) {
    // 跳过（近）透明像素，避免 PNG 透明区被统计成黑色
    if (px[i + 3] < 125) {
      transparentPixels++;
      continue;
    }
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const idx = ((r >> SHIFT) << 10) | ((g >> SHIFT) << 5) | (b >> SHIFT);
    counts[idx]++;
    rSum[idx] += r;
    gSum[idx] += g;
    bSum[idx] += b;
    opaquePixels++;
  }
  let uniqueColors = 0;
  for (let i = 0; i < size; i++) {
    if (counts[i] > 0) uniqueColors++;
  }
  return { opaquePixels, transparentPixels, uniqueColors, counts, rSum, gSum, bSum };
}

/**
 * 由统计桶生成色盘：按像素数降序取种，相近颜色按像素加权合并
 * @param buckets {ColorBuckets} 像素统计桶
 * @param maxColors {number} 色盘最大颜色数
 */
export function buildPalette(buckets: ColorBuckets, maxColors: number): PaletteColor[] {
  type Cand = { r: number, g: number, b: number, count: number };
  const cands: Cand[] = [];
  for (let i = 0; i < buckets.counts.length; i++) {
    const n = buckets.counts[i];
    if (n <= 0) continue;
    // 用桶内真实均值作为候选色，消除量化偏差
    cands.push({ r: buckets.rSum[i] / n, g: buckets.gSum[i] / n, b: buckets.bSum[i] / n, count: n });
  }
  // 像素多的候选优先成为色盘种子
  cands.sort((a, b) => b.count - a.count);

  const pal: Cand[] = [];
  for (const c of cands) {
    // 在已选颜色中找最近者
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < pal.length; i++) {
      const dr = pal[i].r - c.r, dg = pal[i].g - c.g, db = pal[i].b - c.b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (pal.length > 0 && (bestD <= MERGE_DIST_SQ || pal.length >= maxColors)) {
      // 足够相近或色盘已满：按像素数加权平均并入最近颜色，数量累加
      const p = pal[best];
      const t = p.count + c.count;
      p.r = (p.r * p.count + c.r * c.count) / t;
      p.g = (p.g * p.count + c.g * c.count) / t;
      p.b = (p.b * p.count + c.b * c.count) / t;
      p.count = t;
    } else {
      pal.push({ ...c });
    }
  }
  // 合并会改变数量排名，重新排序
  pal.sort((a, b) => b.count - a.count);

  const total = buckets.opaquePixels || 1;
  return pal.map(p => {
    const r = Math.round(p.r), g = Math.round(p.g), b = Math.round(p.b);
    return {
      r, g, b,
      hex: formatHex({ r, g, b, a: 1 }),
      count: p.count,
      percent: p.count / total * 100,
    };
  });
}
