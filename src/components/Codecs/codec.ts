/** 编解码操作模式 */
export type CodecMode = 'encode' | 'decode';

/** UTF-8 字符串 -> 字节数组 */
export function utf8ToBytes(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let cp = str.codePointAt(i)!;
    if (cp > 0xFFFF) i++; // 跳过低位代理
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xC0 | (cp >> 6), 0x80 | (cp & 0x3F));
    } else if (cp < 0x10000) {
      bytes.push(0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
    } else {
      bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
    }
  }
  return new Uint8Array(bytes);
}

/** Unicode 码点 -> UTF-16 字符串（代理对合并） */
export function stringFromCodePoint(cp: number): string {
  if (cp <= 0xFFFF) return String.fromCharCode(cp);
  // 减去 0x10000 后拆分为高低位代理
  const v = cp - 0x10000;
  return String.fromCharCode(0xD800 + (v >> 10), 0xDC00 + (v & 0x3FF));
}
