/**
 * 视频转 GIF：在浏览器本地完成（无需后端、不上传文件）。
 * 抽帧：<video> 逐帧 seek + <canvas> 抓取；
 * 编码：gifenc（量化 + LZW），输出 GIF89a，默认无限循环。
 */
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/** 转换选项 */
export interface ConvertOptions {
  /** 输出帧率（fps），建议 5~15 */
  fps: number;
  /** 输出最大宽度（像素），高度按比例缩放；同时限制高度不超过其 2 倍，避免竖屏过高 */
  maxWidth: number;
  /** 每帧调色板颜色数 2~256，越少体积越小、画质越差 */
  maxColors: number;
  /** 起始时间（秒），默认 0 */
  start: number;
  /** 结束时间（秒），默认视频时长 */
  end: number;
  /** 取消信号 */
  signal?: AbortSignal;
  /** 进度回调（已完成帧数, 总帧数） */
  onProgress?: (done: number, total: number) => void;
}

/** 转换结果 */
export interface ConvertResult {
  blob: Blob;
  width: number;
  height: number;
  frameCount: number;
  duration: number;
}

/** 探测视频元信息（时长、原始宽高） */
export function probeVideoFile(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => {
      URL.revokeObjectURL(url);
    };
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();
      if (!isFinite(duration) || duration <= 0) {
        reject(new Error('无法读取视频时长，请确认文件是否完整'));
        return;
      }
      if (!width || !height) {
        reject(new Error('无法读取视频分辨率'));
        return;
      }
      resolve({ duration, width, height });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('视频加载失败，可能是当前浏览器不支持该编码格式'));
    };
    video.src = url;
  });
}

/** 等待一帧（让浏览器有机会绘制） */
const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

/** 将 Promise 与 AbortSignal 竞速 */
function withAbort<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  if (signal.aborted) return Promise.reject(new DOMException('已取消', 'AbortError'));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('已取消', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(v => { signal.removeEventListener('abort', onAbort); resolve(v); },
      e => { signal.removeEventListener('abort', onAbort); reject(e); });
  });
}

/**
 * 精准 seek 到指定时间：等待 'seeked'，再等两帧确保新帧已上屏；
 * 兜底：若 seeked 未触发但 currentTime 已接近目标，也放行。
 */
function seekTo(video: HTMLVideoElement, t: number, signal?: AbortSignal): Promise<void> {
  const task = new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };
    const finish = () => {
      // 连续两帧 rAF，确保画面真正绘制完成再抓取
      nextFrame().then(nextFrame).then(resolve);
    };
    const onSeeked = () => {
      if (settled) return;
      settled = true;
      cleanup();
      finish();
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('视频解码失败'));
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    try {
      video.currentTime = t;
    } catch (e) {
      cleanup();
      reject(e as Error);
      return;
    }
    // 兜底：某些情况下 seeked 不触发（目标与当前相同等），超时后检查 currentTime
    setTimeout(() => {
      if (settled) return;
      if (Math.abs(video.currentTime - t) < 0.05) {
        settled = true;
        cleanup();
        finish();
      }
    }, 2000);
  });
  return withAbort(task, signal);
}

/** 等比缩放到目标尺寸（宽不超过 maxWidth，高不超过 maxWidth*2，结果取偶数） */
function fitSize(vw: number, vh: number, maxWidth: number): { w: number; h: number } {
  const maxHeight = maxWidth * 2;
  const scale = Math.min(maxWidth / vw, maxHeight / vh, 1);
  const w = Math.max(2, Math.round(vw * scale));
  const h = Math.max(2, Math.round(vh * scale));
  return { w: w % 2 ? w - 1 : w, h: h % 2 ? h - 1 : h };
}

/** 执行转换 */
export async function convertVideoToGif(file: File, opts: ConvertOptions): Promise<ConvertResult> {
  const { fps, maxWidth, start, end, signal } = opts;
  const maxColors = Math.max(2, Math.min(256, Math.floor(opts.maxColors)));

  if (signal?.aborted) throw new DOMException('已取消', 'AbortError');

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  // 挂到 DOM 并隐藏，确保各浏览器都能正常解码
  video.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');

  try {
    document.body.appendChild(video);
    video.src = url;

    await withAbort(new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('视频加载失败'));
    }), signal);

    const duration = video.duration;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!isFinite(duration) || duration <= 0 || !vw || !vh) {
      throw new Error('视频信息读取失败');
    }

    const s = Math.max(0, Math.min(start, duration - 0.001));
    const e = Math.max(s + 0.001, Math.min(end, duration));
    const { w, h } = fitSize(vw, vh, maxWidth);
    canvas.width = w;
    canvas.height = h;

    const total = Math.max(1, Math.floor((e - s) * fps));
    const delay = Math.max(20, Math.round(1000 / fps)); // GIF 最小帧间隔约 20ms

    const gif = GIFEncoder();

    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
      const t = s + i / fps;
      await seekTo(video, Math.min(t, duration - 0.001), signal);
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const palette = quantize(imageData.data, maxColors);
      const index = applyPalette(imageData.data, palette);
      // 第一帧会自动写入文件头 + 全局调色板 + 循环扩展（repeat=0 无限循环）
      gif.writeFrame(index, w, h, { palette, delay, repeat: 0 });
      opts.onProgress?.(i + 1, total);
      // 让出主线程，保证进度 UI 能刷新
      await nextFrame();
    }

    gif.finish();
    const bytes = gif.bytes() as BlobPart;
    const blob = new Blob([bytes], { type: 'image/gif' });
    return { blob, width: w, height: h, frameCount: total, duration: e - s };
  } finally {
    video.remove();
    URL.revokeObjectURL(url);
  }
}
