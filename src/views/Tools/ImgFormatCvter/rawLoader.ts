/**
 * RAW 解码：懒加载 dcraw（Emscripten 移植版，GPL-2.0，约 700KB），
 * 只有实际转换 RAW 文件时才会下载。dcraw 默认输出 8bit sRGB 的 PPM(P6)，
 * 由 parsePpm 解析为像素数据后进入统一转换管线（EXIF 等元数据不会保留）。
 *
 * 加载方式说明：通过 ?url 将 dist/dcraw.js 作为静态资源引入，再以 <script> 标签注入，
 * 这是 dcraw.js 官方文档的浏览器用法（加载后挂载全局 dcraw 函数）；
 * 同时避免打包器解析这份含旧式语法（如 const 重赋值）的 Emscripten 产物。
 */
import { parsePpm, type PixelData } from './imageFormats.ts';

type DcrawFn = (
  buf: Uint8Array,
  options?: Record<string, unknown>,
) => Uint8Array | string | Record<string, Uint8Array>;

/** 加载中的 dcraw（缓存 Promise，失败时重置以便重试） */
let dcrawPromise: Promise<DcrawFn> | null = null;

/** 懒加载 dcraw 脚本并返回全局解码函数 */
function loadDcraw(): Promise<DcrawFn> {
  if (!dcrawPromise) {
    dcrawPromise = (async () => {
      const url = (await import('dcraw/dist/dcraw.js?url')).default;
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('RAW 解码组件（dcraw）加载失败，请检查网络后重试'));
        document.head.appendChild(script);
      });
      const fn = (window as unknown as { dcraw?: DcrawFn }).dcraw;
      if (typeof fn !== 'function') throw new Error('RAW 解码组件（dcraw）初始化失败');
      return fn;
    })().catch(e => {
      dcrawPromise = null;
      throw e;
    });
  }
  return dcrawPromise;
}

/**
 * 解码 RAW 文件为像素数据
 * 注意：dcraw 为同步运算，大文件解码期间主线程会卡住数秒（解码前已让出一帧渲染加载态）
 * @param file {File} RAW 文件
 */
export async function decodeRawFile(file: File): Promise<PixelData> {
  const dcraw = await loadDcraw();
  // 让出主线程一帧，确保「转换中」状态先渲染出来，再进入同步解码
  await new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  const buf = new Uint8Array(await file.arrayBuffer());
  const out = dcraw(buf, { useCameraWhiteBalance: true });
  if (!(out instanceof Uint8Array)) {
    // 无输出文件时 dcraw 返回 stdout 文本，取最后一行作为错误信息
    const text = typeof out === 'string' ? (out.trim().split('\n').filter(Boolean).pop() ?? '') : '';
    throw new Error(text || 'RAW 解码失败：文件可能损坏，或该机型 RAW 暂不受支持');
  }
  return parsePpm(out);
}
