/**
 * Unicode 转义 / 反转义核心逻辑
 * 转义支持 6 种输出格式；反转义自动识别全部格式（可混合出现），并正确处理 emoji 的代理对。
 */
import { stringFromCodePoint } from '../codec.ts';

/** 转义输出格式 */
export type EscFormat = 'u' | 'uBrace' | 'x' | 'htmlHex' | 'htmlDec' | 'percentU';
/** 转义范围 */
export type EscScope = 'nonAscii' | 'all';

/** 数字转十六进制串（可指定最小位数与大小写） */
const toHex = (n: number, pad: number, upper: boolean): string => {
  const s = n.toString(16).padStart(pad, '0');
  return upper ? s.toUpperCase() : s;
};

/**
 * 将文本转为 Unicode 转义串
 * @param text {string} 原文
 * @param fmt {EscFormat} 输出格式
 * @param scope {EscScope} 转义范围：nonAscii 仅转义码点 >0x7E 的字符，all 转义全部字符
 * @param upperHex {boolean} 十六进制字母是否大写
 */
export function escapeUnicode(text: string, fmt: EscFormat, scope: EscScope, upperHex: boolean = false): string {
  let out = '';
  let pos = 0;
  // for...of 按码点迭代，emoji 等代理对不会被拆散
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (scope === 'nonAscii' && cp <= 0x7E) {
      // 反转义会自动识别全部格式，因此原文中与转义序列歧义的 ASCII 字符也必须转义，保证往返一致：
      // 反斜杠总是歧义；& 后跟 #（HTML 实体）、% 后跟 u+4位hex（%u 转义）时歧义
      let ambiguous = ch === '\\';
      if (!ambiguous && ch === '&') ambiguous = text[pos + 1] === '#';
      if (!ambiguous && ch === '%') ambiguous = /^u[0-9a-fA-F]{4}/.test(text.slice(pos + 1, pos + 6));
      if (!ambiguous) {
        out += ch;
        pos += ch.length;
        continue;
      }
    }
    switch (fmt) {
      case 'u':
      case 'percentU': {
        // \uXXXX / %uXXXX：超出基本平面的字符拆为高低位代理对
        const prefix = fmt === 'u' ? '\\u' : '%u';
        if (cp <= 0xFFFF) {
          out += `${prefix}${toHex(cp, 4, upperHex)}`;
        } else {
          const v = cp - 0x10000;
          out += `${prefix}${toHex(0xD800 + (v >> 10), 4, upperHex)}${prefix}${toHex(0xDC00 + (v & 0x3FF), 4, upperHex)}`;
        }
        break;
      }
      case 'uBrace':
        // \u{XXXXX}：ES6 码点转义，无需代理对
        out += `\\u{${toHex(cp, 4, upperHex)}}`;
        break;
      case 'x':
        // \xXX 仅能表示 0x00-0xFF，超出部分按 JS 惯例退回 \uXXXX
        if (cp <= 0xFF) {
          out += `\\x${toHex(cp, 2, upperHex)}`;
        } else if (cp <= 0xFFFF) {
          out += `\\u${toHex(cp, 4, upperHex)}`;
        } else {
          const v = cp - 0x10000;
          out += `\\u${toHex(0xD800 + (v >> 10), 4, upperHex)}\\u${toHex(0xDC00 + (v & 0x3FF), 4, upperHex)}`;
        }
        break;
      case 'htmlHex':
        out += `&#x${toHex(cp, 1, upperHex)};`;
        break;
      case 'htmlDec':
        out += `&#${cp};`;
        break;
    }
    pos += ch.length;
  }
  return out;
}

/** 常见简单转义序列（JS/JSON 风格） */
const SIMPLE_ESC: Record<string, string> = {
  n: '\n', t: '\t', r: '\r', f: '\f', v: '\v', b: '\b',
  '\\': '\\', "'": "'", '"': '"', '/': '/', '0': '\0',
};

/** 紧跟在高位代理项之后的低位代理项（\uDC00-\uDFFF 或 %uDC00-%uDFFF），无 g 标志，无状态 */
const LOW_SURROGATE_RE = /^[\\%]u([dD][c-fC-F][0-9a-fA-F]{2})/;

/**
 * 将转义串还原为原文（自动识别全部支持格式，可混合）
 * @param text {string} 含转义序列的文本
 * @throws {Error} 转义序列非法时抛出，消息中带出错位置
 */
export function unescapeUnicode(text: string): string {
  // 转义总匹配：\u{...} | \uXXXX | %uXXXX | \xXX | &#x...; | &#...; | \任意字符
  // 必须为函数内局部变量：带 g 标志的正则跨调用共享 lastIndex，中途抛错会污染下一次调用
  const ESC_RE = /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|%u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|&#x([0-9a-fA-F]{1,6});|&#([0-9]{1,7});|\\(.)/gs;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = ESC_RE.exec(text)) !== null) {
    out += text.slice(last, m.index);
    const pos = m.index + 1;
    let cp: number;
    if (m[7] !== undefined) {
      // \任意字符：仅接受常见简单转义
      const ch = m[7];
      if (!(ch in SIMPLE_ESC)) {
        throw new Error(`位置 ${pos}：不支持的转义序列 "\\${ch}"`);
      }
      if (ch === '0' && /[0-9]/.test(text[ESC_RE.lastIndex] ?? '')) {
        throw new Error(`位置 ${pos}：不支持八进制转义 "\\0${text[ESC_RE.lastIndex]}"`);
      }
      out += SIMPLE_ESC[ch];
      last = ESC_RE.lastIndex;
      continue;
    }
    if (m[1] !== undefined) {
      // \u{XXXXX}
      cp = parseInt(m[1], 16);
    } else if (m[2] !== undefined || m[3] !== undefined) {
      // \uXXXX / %uXXXX：高位代理项需与其后的低位代理项合并为一个码点
      const raw = (m[2] ?? m[3])!;
      const prefix = m[2] !== undefined ? '\\u' : '%u';
      cp = parseInt(raw, 16);
      if (cp >= 0xD800 && cp <= 0xDBFF) {
        const pair = LOW_SURROGATE_RE.exec(text.slice(ESC_RE.lastIndex));
        if (!pair) {
          throw new Error(`位置 ${pos}：${prefix}${raw} 是未配对的高位代理项，无法还原为字符`);
        }
        cp = 0x10000 + ((cp - 0xD800) << 10) + (parseInt(pair[1], 16) - 0xDC00);
        ESC_RE.lastIndex += pair[0].length;
      } else if (cp >= 0xDC00 && cp <= 0xDFFF) {
        throw new Error(`位置 ${pos}：${prefix}${raw} 是孤立的低位代理项`);
      }
    } else if (m[4] !== undefined) {
      cp = parseInt(m[4], 16);
    } else if (m[5] !== undefined) {
      cp = parseInt(m[5], 16);
    } else {
      cp = parseInt(m[6]!, 10);
    }
    if (cp > 0x10FFFF) {
      throw new Error(`位置 ${pos}：码点 U+${cp.toString(16).toUpperCase()} 超出 Unicode 上限（U+10FFFF）`);
    }
    if (cp >= 0xD800 && cp <= 0xDFFF) {
      throw new Error(`位置 ${pos}：码点 U+${cp.toString(16).toUpperCase()} 是代理项，不是合法字符`);
    }
    out += stringFromCodePoint(cp);
    last = ESC_RE.lastIndex;
  }
  out += text.slice(last);
  return out;
}
