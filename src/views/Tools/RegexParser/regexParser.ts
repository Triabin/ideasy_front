/**
 * 正则表达式解析工具
 * 1. explainRegex：把表达式逐片段拆解为可读的中文说明
 * 2. testRegex：基于浏览器原生 JavaScript RegExp 引擎执行匹配
 */

/** 片段类型 */
export type RegexTokenKind =
    | 'literal'
    | 'dot'
    | 'escape'
    | 'char-class'
    | 'anchor'
    | 'quantifier'
    | 'alternation'
    | 'group-open'
    | 'group-close'
    | 'flag';

/** 表达式中的一个片段 */
export interface RegexToken {
  /** 原始片段 */
  raw: string;
  /** 片段类型 */
  kind: RegexTokenKind;
  /** 中文含义 */
  desc: string;
  /** 分组嵌套深度，用于缩进展示 */
  depth: number;
  /** 在表达式中的起始下标 */
  start: number;
  /** 在表达式中的结束下标（不含） */
  end: number;
}

/** 捕获分组信息 */
export interface RegexCaptureGroup {
  /** 分组序号（从 1 开始） */
  index: number;
  /** 命名分组的名称 */
  name?: string;
}

/** 表达式解析结果 */
export interface RegexExplainResult {
  tokens: RegexToken[];
  groups: RegexCaptureGroup[];
  warnings: string[];
}

/** 单个匹配结果 */
export interface RegexMatchInfo {
  /** 匹配起始下标 */
  index: number;
  /** 匹配到的文本（零宽匹配时为空串） */
  text: string;
  /** 数字捕获分组 */
  groups: { index: number; text: string | undefined }[];
  /** 命名捕获分组 */
  named: { name: string; text: string | undefined }[];
}

/** 匹配测试结果 */
export interface RegexTestResult {
  ok: boolean;
  error?: string;
  matches: RegexMatchInfo[];
  /** 是否因超出上限而截断 */
  truncated: boolean;
}

const KIND_LABEL: Record<RegexTokenKind, string> = {
  literal: '字面量',
  dot: '任意字符',
  escape: '转义',
  'char-class': '字符集合',
  anchor: '锚点',
  quantifier: '量词',
  alternation: '分支',
  'group-open': '分组开始',
  'group-close': '分组结束',
  flag: '标志',
};

/** 获取片段类型的中文名称 */
export const regexTokenKindLabel = (kind: RegexTokenKind): string => KIND_LABEL[kind];

/** 字符集合外的常见转义含义 */
const SIMPLE_ESCAPE: Record<string, string> = {
  d: '数字字符（0-9）',
  D: '非数字字符',
  w: '单词字符（字母、数字或下划线）',
  W: '非单词字符',
  s: '空白字符（空格、制表符、换行等）',
  S: '非空白字符',
  b: '单词边界（零宽断言）',
  B: '非单词边界（零宽断言）',
  n: '换行符 LF（\\n）',
  r: '回车符 CR（\\r）',
  t: '制表符 TAB（\\t）',
  f: '换页符（\\f）',
  v: '垂直制表符（\\v）',
  '0': '空字符 NUL（\\0）',
};

/** 字符集合内的转义含义（\\b 在集合内表示退格） */
const CLASS_ESCAPE: Record<string, string> = {
  ...SIMPLE_ESCAPE,
  b: '退格符',
};

/** 判断表达式是否使用了 Unicode 模式 */
const isUnicodeMode = (flags: string): boolean => flags.includes('u') || flags.includes('v');

/**
 * 解析单个反斜杠转义
 * @param src {string} 完整表达式
 * @param i {number} 反斜杠所在下标
 * @param flags {string} 匹配标志
 */
function describeEscape(src: string, i: number, flags: string): { raw: string; desc: string; warn?: string } {
  const next = src[i + 1];
  if (next === undefined) {
    return { raw: '\\', desc: '结尾的单独反斜杠', warn: '表达式以反斜杠结尾，缺少要转义的字符' };
  }
  const unicodeMode = isUnicodeMode(flags);

  if (next === 'x') {
    const hex = src.slice(i + 2, i + 4);
    if (/^[0-9a-fA-F]{2}$/.test(hex)) {
      return { raw: src.slice(i, i + 4), desc: `十六进制转义字符 U+00${hex.toUpperCase()}` };
    }
    return { raw: src.slice(i, i + 2), desc: '十六进制转义（格式不完整）', warn: '“\\x” 后应跟两位十六进制数字' };
  }

  if (next === 'u') {
    if (src[i + 2] === '{') {
      const close = src.indexOf('}', i + 3);
      if (close > i) {
        const hex = src.slice(i + 3, close);
        const raw = src.slice(i, close + 1);
        if (/^[0-9a-fA-F]+$/.test(hex)) {
          const code = parseInt(hex, 16);
          const char = code <= 0x10ffff ? `（${String.fromCodePoint(code)}）` : '';
          return {
            raw,
            desc: `Unicode 码点转义 U+${hex.toUpperCase()}${char}`,
            warn: unicodeMode ? undefined : '“\\u{…}” 需要 u 或 v 标志才生效',
          };
        }
        return { raw, desc: 'Unicode 码点转义（格式不完整）', warn: '“\\u{…}” 中应包含十六进制码点' };
      }
    }
    const hex = src.slice(i + 2, i + 6);
    if (/^[0-9a-fA-F]{4}$/.test(hex)) {
      return {
        raw: src.slice(i, i + 6),
        desc: `Unicode 转义字符 U+${hex.toUpperCase()}（${String.fromCharCode(parseInt(hex, 16))}）`,
      };
    }
    return { raw: src.slice(i, i + 2), desc: 'Unicode 转义（格式不完整）', warn: '“\\u” 后应跟四位十六进制数字' };
  }

  if (next === 'c') {
    const ch = src[i + 2];
    if (ch && /[A-Za-z]/.test(ch)) {
      return { raw: src.slice(i, i + 3), desc: `控制字符 Ctrl-${ch.toUpperCase()}` };
    }
    return { raw: src.slice(i, i + 2), desc: '控制字符转义（格式不完整）', warn: '“\\c” 后应跟一个英文字母' };
  }

  if (next === 'p' || next === 'P') {
    if (src[i + 2] === '{') {
      const close = src.indexOf('}', i + 3);
      if (close > i) {
        return {
          raw: src.slice(i, close + 1),
          desc: `Unicode 属性${next === 'P' ? '（取反）' : ''}匹配：满足 ${src.slice(i + 3, close)} 的字符`,
          warn: unicodeMode ? undefined : `“\\${next}{…}” 需要 u 或 v 标志才生效`,
        };
      }
    }
    return { raw: src.slice(i, i + 2), desc: 'Unicode 属性转义（格式不完整）', warn: `“\\${next}” 后应跟 {属性名}` };
  }

  if (next === 'k') {
    if (src[i + 2] === '<') {
      const close = src.indexOf('>', i + 3);
      if (close > i) {
        return { raw: src.slice(i, close + 1), desc: `反向引用命名分组 “${src.slice(i + 3, close)}”` };
      }
    }
    return { raw: src.slice(i, i + 2), desc: '命名分组反向引用（格式不完整）', warn: '“\\k” 后应跟 <分组名>' };
  }

  if (/[1-9]/.test(next)) {
    let j = i + 1;
    while (j < src.length && /\d/.test(src[j])) j++;
    return { raw: src.slice(i, j), desc: `反向引用第 ${src.slice(i + 1, j)} 个捕获分组` };
  }

  const simple = SIMPLE_ESCAPE[next];
  if (simple) return { raw: src.slice(i, i + 2), desc: simple };

  return { raw: src.slice(i, i + 2), desc: `匹配字面量字符 “${next}”` };
}

/** 拆解字符集合内部的内容，尽量列出可匹配项 */
function describeClassItems(content: string): string[] {
  const items: string[] = [];
  let j = 0;
  while (j < content.length) {
    const c = content[j];
    if (c === '\\') {
      const e = content[j + 1] ?? '';
      const meaning = CLASS_ESCAPE[e];
      items.push(meaning ? `\\${e}（${meaning}）` : `\\${e}`);
      j += 2;
    } else if (j + 2 < content.length + 1 && content[j + 1] === '-' && content[j + 2] !== undefined) {
      items.push(`${c}-${content[j + 2]}`);
      j += 3;
    } else {
      items.push(c === ' ' ? '空格' : c);
      j += 1;
    }
  }
  return items;
}

/** 解析字符集合 [ ... ] */
function parseCharClass(src: string, start: number): { raw: string; desc: string; warn?: string } {
  let i = start + 1;
  let negated = false;
  if (src[i] === '^') {
    negated = true;
    i++;
  }
  const contentStart = i;
  let closed = false;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === ']') {
      closed = true;
      i++;
      break;
    }
    i++;
  }
  const raw = src.slice(start, i);
  const content = src.slice(contentStart, closed ? i - 1 : i);
  const items = describeClassItems(content);
  let desc = negated
      ? `字符集合 ${raw}：匹配不在集合中的任意一个字符`
      : `字符集合 ${raw}：匹配集合中的任意一个字符`;
  if (items.length) desc += `（包含：${items.join('、')}）`;
  return { raw, desc, warn: closed ? undefined : '字符集合缺少 “]” 结束符' };
}

/**
 * 解析正则表达式，逐片段返回中文说明
 * @param pattern {string} 不含首尾斜杠的表达式
 * @param flags {string} 匹配标志，用于提示部分语法是否生效
 */
export function explainRegex(pattern: string, flags: string = ''): RegexExplainResult {
  const tokens: RegexToken[] = [];
  const groups: RegexCaptureGroup[] = [];
  const warnings: string[] = [];
  let i = 0;
  let depth = 0;
  let capIndex = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    // 分组开始
    if (ch === '(') {
      let raw = '(';
      let len = 1;
      let desc = '';
      let capture = false;
      let name: string | undefined;
      let opensGroup = true;

      if (pattern.startsWith('(?:', i)) {
        raw = '(?:';
        len = 3;
        desc = '非捕获分组：仅用于分组，不保存匹配结果';
      } else if (pattern.startsWith('(?=', i)) {
        raw = '(?=';
        len = 3;
        desc = '正向先行断言：要求右侧能匹配以下内容，但不消耗字符';
      } else if (pattern.startsWith('(?!', i)) {
        raw = '(?!';
        len = 3;
        desc = '负向先行断言：要求右侧不能匹配以下内容';
      } else if (pattern.startsWith('(?<=', i)) {
        raw = '(?<=';
        len = 4;
        desc = '正向后行断言：要求左侧能匹配以下内容，但不消耗字符';
      } else if (pattern.startsWith('(?<!', i)) {
        raw = '(?<!';
        len = 4;
        desc = '负向后行断言：要求左侧不能匹配以下内容';
      } else if (pattern.startsWith('(?<', i)) {
        const close = pattern.indexOf('>', i + 3);
        if (close > i) {
          name = pattern.slice(i + 3, close);
          raw = pattern.slice(i, close + 1);
          len = raw.length;
          desc = `命名捕获分组 “${name}”：匹配内容保存到 groups.${name}`;
          capture = true;
        } else {
          raw = '(?<';
          len = 3;
          desc = '命名捕获分组（缺少 “>” 结束符）';
          warnings.push('命名捕获分组缺少 “>” 结束符');
        }
      } else if (pattern.startsWith('(?', i)) {
        // 内联标志：ES2025 的 (?i:...) 或 (?i)
        const m = /^\(\?([ims]*)(?:-([ims]+))?([:)])/.exec(pattern.slice(i));
        if (m) {
          raw = m[0];
          len = raw.length;
          const inline = `${m[1]}${m[2] ? `-${m[2]}` : ''}`;
          if (m[3] === ')') {
            opensGroup = false;
            desc = `内联标志 ${inline}：从当前位置起改变匹配标志`;
          } else {
            desc = `内联标志分组 ${inline}：组内启用指定标志`;
          }
        } else {
          raw = '(?';
          len = 2;
          desc = '分组（未知的 (? 扩展语法）';
        }
      } else {
        desc = `捕获分组 #${capIndex + 1}：匹配内容会被保存，可在表达式或结果中引用`;
        capture = true;
      }

      tokens.push({
        raw,
        kind: opensGroup ? 'group-open' : 'flag',
        desc,
        depth,
        start: i,
        end: i + len,
      });
      if (capture) {
        capIndex++;
        groups.push({ index: capIndex, name });
      }
      if (opensGroup) depth++;
      i += len;
      continue;
    }

    // 分组结束
    if (ch === ')') {
      if (depth === 0) warnings.push('存在多余的 “)”');
      depth = Math.max(0, depth - 1);
      tokens.push({ raw: ')', kind: 'group-close', desc: '分组结束', depth, start: i, end: i + 1 });
      i++;
      continue;
    }

    // 字符集合
    if (ch === '[') {
      const res = parseCharClass(pattern, i);
      tokens.push({ raw: res.raw, kind: 'char-class', desc: res.desc, depth, start: i, end: i + res.raw.length });
      if (res.warn) warnings.push(res.warn);
      i += res.raw.length;
      continue;
    }

    // 转义
    if (ch === '\\') {
      const res = describeEscape(pattern, i, flags);
      tokens.push({ raw: res.raw, kind: 'escape', desc: res.desc, depth, start: i, end: i + res.raw.length });
      if (res.warn) warnings.push(res.warn);
      i += res.raw.length;
      continue;
    }

    // 锚点
    if (ch === '^' || ch === '$') {
      tokens.push({
        raw: ch,
        kind: 'anchor',
        desc: ch === '^' ? '匹配字符串（m 标志下为每一行）的开头' : '匹配字符串（m 标志下为每一行）的结尾',
        depth,
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // 任意字符
    if (ch === '.') {
      tokens.push({
        raw: '.',
        kind: 'dot',
        desc: '匹配除换行符外的任意字符（s 标志下也匹配换行）',
        depth,
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // 分支
    if (ch === '|') {
      tokens.push({
        raw: '|',
        kind: 'alternation',
        desc: '选择分支：匹配左侧或右侧的任一表达式',
        depth,
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // 量词
    if (ch === '*' || ch === '+' || ch === '?') {
      let raw = ch;
      let desc = ch === '*' ? '重复 0 次或多次' : ch === '+' ? '重复 1 次或多次' : '出现 0 次或 1 次（可选）';
      if (pattern[i + 1] === '?') {
        raw += '?';
        desc += '（懒惰模式：尽可能少匹配）';
      }
      tokens.push({ raw, kind: 'quantifier', desc, depth, start: i, end: i + raw.length });
      i += raw.length;
      continue;
    }

    if (ch === '{') {
      const m = /^\{(\d+)(?:,(\d*))?\}(\?)?/.exec(pattern.slice(i));
      if (m) {
        let desc: string;
        if (m[2] === undefined) desc = `重复恰好 ${m[1]} 次`;
        else if (m[2] === '') desc = `重复至少 ${m[1]} 次`;
        else desc = `重复 ${m[1]} 到 ${m[2]} 次`;
        if (m[3]) desc += '（懒惰模式：尽可能少匹配）';
        const raw = m[0];
        tokens.push({ raw, kind: 'quantifier', desc, depth, start: i, end: i + raw.length });
        i += raw.length;
        continue;
      }
      // 不是合法量词，按字面量处理
    }

    // 连续字面量
    let end = i;
    while (end < pattern.length && !'\\^$.*+?()[]{}|'.includes(pattern[end])) end++;
    if (end === i) end = i + 1;
    const raw = pattern.slice(i, end);
    tokens.push({
      raw,
      kind: 'literal',
      desc: `匹配字面量 “${raw}”`,
      depth,
      start: i,
      end,
    });
    i = end;
  }

  if (depth > 0) warnings.push('分组缺少 “)” 结束符');

  return { tokens, groups, warnings: [...new Set(warnings)] };
}

/** 按 Unicode 码点前进一位，避免零宽匹配后死循环 */
function advance(text: string, index: number, unicode: boolean): number {
  if (index >= text.length) return index + 1;
  if (unicode) {
    const code = text.codePointAt(index);
    return index + (code !== undefined && code > 0xffff ? 2 : 1);
  }
  return index + 1;
}

/**
 * 执行正则匹配
 * @param pattern {string} 表达式
 * @param flags {string} 标志
 * @param text {string} 测试文本
 * @param limit {number} 最多返回的匹配数量
 */
export function testRegex(pattern: string, flags: string, text: string, limit: number = 500): RegexTestResult {
  if (!pattern) return { ok: true, matches: [], truncated: false };

  let re: RegExp;
  try {
    // 未开启 g / y 时补上 g，便于展示全部匹配；同时避免污染外部实例
    re = new RegExp(pattern, flags.includes('g') || flags.includes('y') ? flags : `${flags}g`);
  } catch (e: any) {
    return { ok: false, error: e?.message ?? '正则表达式语法错误', matches: [], truncated: false };
  }

  const matches: RegexMatchInfo[] = [];
  const unicode = isUnicodeMode(flags);
  let truncated = false;
  let exec: RegExpExecArray | null;

  while ((exec = re.exec(text)) !== null) {
    matches.push({
      index: exec.index,
      text: exec[0],
      groups: exec.slice(1).map((value, idx) => ({ index: idx + 1, text: value })),
      named: exec.groups
          ? Object.entries(exec.groups).map(([name, value]) => ({ name, text: value }))
          : [],
    });

    if (matches.length >= limit) {
      truncated = true;
      break;
    }

    // 零宽匹配不会自动推进 lastIndex，需手动跳过一个字符
    if (exec[0] === '') {
      re.lastIndex = advance(text, re.lastIndex, unicode);
      if (re.lastIndex > text.length) break;
    }
  }

  return { ok: true, matches, truncated };
}
