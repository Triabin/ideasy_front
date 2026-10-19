/**
 * Base64 编解码处理器
 * 支持：标准 Base64 / URL 安全 Base64；padding 可选；UTF-8 严格校验；纯文本模式（Latin-1 兼容）
 */
import { stringFromCodePoint } from '../codec.ts';
/** Base64标准字符串 */
const B64_STD_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** 字符 -> Latin-1 字节码点（纯文本模式下使用） */
export function latin1Bytes(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c > 0xFF) throw new Error(`纯文本模式下仅支持单字节字符（U+0000 ~ U+00FF），发现字符“${str[i]}”`);
    arr[i] = c;
  }
  return arr;
}

/** Latin-1 字节 -> 字符串 */
export function fromLatin1(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/** 字节数组 -> 标准 Base64 字符串（带 padding） */
export function bytesToBase64Standard(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  // 每 3 字节 -> 4 个 Base64 字符
  for (; i + 3 <= bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64_STD_CHARS[(n >> 18) & 63] + B64_STD_CHARS[(n >> 12) & 63] + B64_STD_CHARS[(n >> 6) & 63] + B64_STD_CHARS[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64_STD_CHARS[(n >> 18) & 63] + B64_STD_CHARS[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64_STD_CHARS[(n >> 18) & 63] + B64_STD_CHARS[(n >> 12) & 63] + B64_STD_CHARS[(n >> 6) & 63] + '=';
  }
  return out;
}

/** Base64 字符（标准或 URL 安全）-> 6bit 值 */
function base64CharValue(ch: string): number {
  const idx = B64_STD_CHARS.indexOf(ch);
  if (idx >= 0) return idx;
  if (ch === '-') return 62;
  if (ch === '_') return 63;
  return -1;
}

/**
 * Base64 字符串 -> 字节数组
 * 严格校验：
 * - 非法字符
 * - padding 数量 / 位置
 * - 隐式 padding（尾部多余 bit 非 0）
 * 同时接受标准与 URL 安全字母表
 */
export function base64ToBytes(str: string): Uint8Array {
  if (typeof str !== 'string') {
    throw new TypeError('输入必须是字符串');
  }
  // 1. 去除所有空白字符
  let s = str.replace(/\s+/g, '');
  // 2. 分离尾部 padding
  let body = s;
  let pad = 0;
  const m = s.match(/(=*)$/);
  if (m && m[1]) {
    pad = m[1].length;
    body = s.slice(0, s.length - pad);
  }
  // 3. padding 数量校验
  if (pad > 2) {
    throw new Error('padding（=）数量不合法（最多 2 个）');
  }
  // 4. 总长度必须是 4 的倍数
  if ((body.length + pad) % 4 !== 0) {
    throw new Error('Base64长度不合法（总长度 mod 4必须为0）');
  }
  // 5. 如果padding存在，body 长度必须是 4 对齐的
  if (pad === 0 && body.indexOf('=') > -1) {
    throw new Error('padding（=）位置不合法');
  }
  // 6. 逐字符校验
  for (let i = 0; i < body.length; i++) {
    if (base64CharValue(body[i]) < 0) {
      throw new Error(
        `存在非法的Base64字符“${body[i]}”（第${i + 1}个字符处）`
      );
    }
  }
  // 7. 拼接 bit 流
  let bin = '';
  for (let i = 0; i < body.length; i++) {
    bin += base64CharValue(body[i]).toString(2).padStart(6, '0');
  }
  // 8. 显式 padding：每个 = 去掉 2 bit
  if (pad > 0) {
    bin = bin.slice(0, bin.length - pad * 2);
  }
  // 9. 隐式 padding 校验
  const rem = bin.length % 8;
  if (rem !== 0) {
    const tail = bin.slice(bin.length - rem);
    if (tail !== '0'.repeat(rem)) {
      throw new Error('Base64末尾存在无效比特（缺少必要的padding？）');
    }
    bin = bin.slice(0, bin.length - rem);
  }
  // 10. 转为字节数组
  if (bin.length % 8 !== 0) {
    throw new Error('内部错误：bit长度不是8的倍数');
  }
  const bytes = new Uint8Array(bin.length / 8);
  for (let i = 0; i < bin.length; i += 8) {
    bytes[i / 8] = parseInt(bin.slice(i, i + 8), 2);
  }
  return bytes;
}

/** 字节数组 -> UTF-8 字符串（手写解码，可精确报告非法序列位置） */
export function bytesToUtf8(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      out += String.fromCharCode(b1);
      continue;
    }
    // 判断后续需要的延续字节数
    let extra: number;
    let cp: number;
    if ((b1 & 0xE0) === 0xC0) { extra = 1; cp = b1 & 0x1F; }
    else if ((b1 & 0xF0) === 0xE0) { extra = 2; cp = b1 & 0x0F; }
    else if ((b1 & 0xF8) === 0xF0) { extra = 3; cp = b1 & 0x07; }
    else throw new Error(`存在非法的UTF-8首字节0x${b1.toString(16).toUpperCase()}（第${i}个字节处）`);
    if (i + extra > bytes.length) throw new Error(`UTF-8序列不完整（第${i}个字节处）`);
    for (let j = 0; j < extra; j++) {
      const bc = bytes[i++];
      if ((bc & 0xC0) !== 0x80) throw new Error(`存在非法的UTF-8延续字节0x${bc.toString(16).toUpperCase()}（第${i}个字节处）`);
      cp = (cp << 6) | (bc & 0x3F);
    }
    // 拒绝过长编码（overlong encoding）
    const min = extra === 1 ? 0x80 : extra === 2 ? 0x800 : 0x10000;
    if (cp < min) throw new Error(`存在过长的UTF-8编码序列（第${i - extra}个字节处）`);
    out += stringFromCodePoint(cp);
  }
  return out;
}
