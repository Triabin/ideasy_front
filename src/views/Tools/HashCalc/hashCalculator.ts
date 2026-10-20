/** 哈希计算核心逻辑：基于 Web Crypto API，支持 MD5 / SHA1 / SHA256，字符串与文件哈希计算 */

/** 支持的哈希算法 */
export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256';

/** 算法信息（展示名、别名等） */
export interface AlgorithmInfo {
  /** Web Crypto / 内部实现使用的算法标识 */
  value: HashAlgorithm;
  /** 展示名称 */
  label: string;
  /** 常用别名（粘贴/输入时兼容） */
  alias: string[];
  /** 摘要长度（bit） */
  bits: number;
}

/** 可选算法列表（新增算法时在此追加即可） */
export const ALGORITHMS: AlgorithmInfo[] = [
  { value: 'MD5', label: 'MD5', alias: ['md5'], bits: 128 },
  { value: 'SHA-1', label: 'SHA1', alias: ['sha1', 'sha-1'], bits: 160 },
  { value: 'SHA-256', label: 'SHA256', alias: ['sha256', 'sha-256'], bits: 256 },
];

/** 十六进制格式化选项 */
export interface HexFormatOptions {
  /** 是否大写 */
  uppercase?: boolean;
  /** 每 n 个字符分组（0 或不传表示不分隔） */
  groupSize?: number;
  /** 组间分隔符 */
  separator?: string;
}

/** 将字节数组转为十六进制字符串 */
export function bytesToHex(bytes: Uint8Array, opts: HexFormatOptions = {}): string {
  let hex = '';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  if (opts.uppercase) hex = hex.toUpperCase();
  const size = opts.groupSize ?? 0;
  if (size > 0) {
    const groups: string[] = [];
    for (let i = 0; i < hex.length; i += size) {
      groups.push(hex.slice(i, i + size));
    }
    hex = groups.join(opts.separator ?? '');
  }
  return hex;
}

/** 将十六进制字符串（可含分隔符）还原为字节数组 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[\s:_-]/g, '');
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error('非法的十六进制字符串');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/* ------------------------- MD5（纯 JS 实现，Web Crypto 不支持 MD5） ------------------------- */

/** MD5 每轮循环左移位数 */
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

/** MD5 常量表 K[i] = floor(abs(sin(i + 1)) * 2^32) */
const MD5_K = new Uint32Array(64);
for (let i = 0; i < 64; i++) {
  MD5_K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
}

/** 32 位循环左移 */
function md5Rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

/**
 * 计算 MD5（支持传入多个数据块，用于分块流式计算）
 * @param chunks {Uint8Array[]} 输入数据的各分块
 * @returns {Uint8Array} 16 字节摘要
 */
export function md5(chunks: Uint8Array[]): Uint8Array {
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  let totalLen = 0; // bit 长度（按 modulo 2^64 统计）
  let buffer = new Uint8Array(0); // 未满 64 字节的残留数据

  /** 处理一个 64 字节分组 */
  const processBlock = (block: Uint8Array) => {
    const m = new Uint32Array(16);
    for (let i = 0; i < 16; i++) {
      m[i] = block[i * 4] | (block[i * 4 + 1] << 8) | (block[i * 4 + 2] << 16) | (block[i * 4 + 3] << 24);
    }
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F = 0, g = 0;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + MD5_K[i] + m[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + md5Rotl(F, MD5_S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  };

  // 依次喂入所有分块
  for (const chunk of chunks) {
    totalLen += chunk.length * 8;
    // 拼接残留数据
    const merged = new Uint8Array(buffer.length + chunk.length);
    merged.set(buffer);
    merged.set(chunk, buffer.length);
    let offset = 0;
    while (merged.length - offset >= 64) {
      processBlock(merged.subarray(offset, offset + 64));
      offset += 64;
    }
    buffer = merged.slice(offset);
  }

  // Padding：追加 0x80 + 若干 0x00 + 8 字节小端消息长度
  const padLen = buffer.length < 56 ? 64 - buffer.length : 128 - buffer.length;
  const padding = new Uint8Array(padLen);
  padding[0] = 0x80;
  const dv = new DataView(padding.buffer);
  // 总长度低 32 位与高 32 位（JS 中安全范围内高 32 位通常为 0）
  dv.setUint32(padLen - 8, totalLen >>> 0, true);
  dv.setUint32(padLen - 4, Math.floor(totalLen / 4294967296) >>> 0, true);

  const tail = new Uint8Array(buffer.length + padding.length);
  tail.set(buffer);
  tail.set(padding, buffer.length);
  for (let i = 0; i < tail.length; i += 64) {
    processBlock(tail.subarray(i, i + 64));
  }

  // 输出 16 字节小端摘要
  const digest = new Uint8Array(16);
  const odv = new DataView(digest.buffer);
  [a0, b0, c0, d0].forEach((v, i) => odv.setUint32(i * 4, v, true));
  return digest;
}

/* ------------------------- SHA-1 / SHA-256（Web Crypto） ------------------------- */

/** Web Crypto 是否可用（要求安全上下文：https 或 localhost） */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

/** 使用 Web Crypto 计算 SHA 系列摘要 */
async function shaBySubtle(algo: 'SHA-1' | 'SHA-256', data: ArrayBuffer): Promise<Uint8Array> {
  if (!isCryptoAvailable()) {
    throw new Error('当前环境非安全上下文（需要 https 或 localhost），无法使用 Web Crypto 计算 ' + algo);
  }
  const digest = await crypto.subtle.digest(algo, data);
  return new Uint8Array(digest);
}

/* ------------------------- 对外统一接口 ------------------------- */

/** 归一化算法名：'md5'/'SHA1'/'sha-256' → 'MD5'/'SHA-1'/'SHA-256' */
export function normalizeAlgorithm(name: string): HashAlgorithm | null {
  const key = name.trim().toLowerCase().replace(/\s+/g, '');
  for (const a of ALGORITHMS) {
    if (a.value.toLowerCase() === key || a.label.toLowerCase() === key || a.alias.includes(key)) {
      return a.value;
    }
  }
  return null;
}

/**
 * 计算字符串哈希（UTF-8 编码）
 * @param text {string} 待计算字符串
 * @param algorithm {HashAlgorithm} 算法
 * @returns {Promise<string>} 小写十六进制摘要
 */
export async function hashString(text: string, algorithm: HashAlgorithm): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (algorithm === 'MD5') {
    return bytesToHex(md5([bytes]));
  }
  const digest = await shaBySubtle(algorithm, bytes.buffer as ArrayBuffer);
  return bytesToHex(digest);
}

/** 文件读取分块大小（2MB） */
const FILE_CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * 计算文件哈希（分块读取，避免大文件一次性载入内存；带进度回调）
 * @param file {File} 文件对象
 * @param algorithm {HashAlgorithm} 算法
 * @param onProgress {(ratio:number)=>void} 进度回调（0~1）
 * @returns {Promise<string>} 小写十六进制摘要
 */
export async function hashFile(
  file: File,
  algorithm: HashAlgorithm,
  onProgress?: (ratio: number) => void
): Promise<string> {
  if (algorithm === 'MD5') {
    // MD5 自行分块累积计算
    const chunks: Uint8Array[] = [];
    let offset = 0;
    while (offset < file.size) {
      const slice = file.slice(offset, Math.min(offset + FILE_CHUNK_SIZE, file.size));
      chunks.push(new Uint8Array(await slice.arrayBuffer()));
      offset += FILE_CHUNK_SIZE;
      onProgress?.(file.size ? Math.min(offset / file.size, 1) : 1);
    }
    // 空文件也需要处理
    if (!chunks.length) chunks.push(new Uint8Array(0));
    return bytesToHex(md5(chunks));
  }

  // SHA 系列：Web Crypto 的 digest 需要完整数据，这里分块读取并合并，同时上报进度
  const parts: Uint8Array[] = [];
  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, Math.min(offset + FILE_CHUNK_SIZE, file.size));
    parts.push(new Uint8Array(await slice.arrayBuffer()));
    offset += FILE_CHUNK_SIZE;
    onProgress?.(file.size ? Math.min(offset / file.size, 1) : 1);
  }
  if (!parts.length) parts.push(new Uint8Array(0));
  const merged = new Uint8Array(parts.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const p of parts) {
    merged.set(p, pos);
    pos += p.length;
  }
  const digest = await shaBySubtle(algorithm, merged.buffer as ArrayBuffer);
  return bytesToHex(digest);
}

/** 格式化文件大小显示 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(2)} ${units[i]}`;
}
