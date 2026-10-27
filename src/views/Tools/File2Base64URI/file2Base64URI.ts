import { MyFileUtils } from '@/common/utils.ts';

/** 单个文件的转换状态 */
export type ConvertStatus = 'idle' | 'busy' | 'done' | 'error';

/** 文件体积告警级别 */
export type SizeAlertLevel = 'none' | 'info' | 'warning' | 'danger';

/** 转换结果 */
export interface ConvertResult {
  /** 完整的 Base64 DataURI 字符串 */
  uri: string;
  /** MIME 类型 */
  mimeType: string;
  /** 是否采用 FileReader 之外的分块读取方案（大文件兜底） */
  chunked: boolean;
}

/** 转换选项 */
export interface ConvertOptions {
  /** 是否强制转换（超过危险阈值时必须为 true 才允许执行） */
  force: boolean;
  /** 提示级阈值（字节），超过则给出“可能偏大”的提示，仍可直接运行 */
  infoThreshold: number;
  /** 警告级阈值（字节），超过则弹出确认框，用户确认（强制运行）后继续 */
  warnThreshold: number;
  /** 危险级阈值（字节），超过则默认拒绝转换，必须勾选“强制运行”后才可执行 */
  dangerThreshold: number;
}

/**
 * 根据当前告警体系计算某文件的告警级别
 * @param size {number} 文件字节数
 * @param options {ConvertOptions} 转换选项（包含各级阈值）
 */
export function getSizeAlertLevel(
  size: number,
  options: Pick<ConvertOptions, 'infoThreshold' | 'warnThreshold' | 'dangerThreshold'>
): SizeAlertLevel {
  if (size > options.dangerThreshold) return 'danger';
  if (size > options.warnThreshold) return 'warning';
  if (size > options.infoThreshold) return 'info';
  return 'none';
}

/**
 * 将文件转换为 Base64 DataURI。
 * 告警体系由调用方在转换前通过 getSizeAlertLevel 判定；本函数只负责实际执行，
 * 并在 FileReader 失败时自动降级为分块读取（force 场景下的大文件兜底）。
 * @param file {File} 目标文件
 * @param onProgress {(ratio:number)=>void} 进度回调（0~1）
 * @return {Promise<ConvertResult>} 转换结果
 */
export async function fileToBase64URI(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<ConvertResult> {
  const mimeType = MyFileUtils.getMimeType(file);
  onProgress?.(0.05);
  try {
    const uri = await MyFileUtils.readByFileReader2URI(file);
    onProgress?.(1);
    return { uri, mimeType, chunked: false };
  } catch (e) {
    // FileReader 对超大文件可能因内存限制失败，降级为分块读取
    console.warn('FileReader 读取失败，尝试分块读取', e);
    onProgress?.(0.4);
    const base64 = await MyFileUtils.readByChunks(file);
    const uri = `data:${mimeType};base64,${base64}`
    onProgress?.(1);
    return { uri, mimeType, chunked: true };
  }
}
