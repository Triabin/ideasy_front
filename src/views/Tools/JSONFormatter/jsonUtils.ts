/** JSON 格式化核心工具：宽松解析 / 美化输出 / 压缩 / 键排序 / 错误定位 */

/** JSON 节点类型 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export interface JsonArray extends Array<JsonValue> {}

/** 解析错误（携带出错位置信息） */
export class JsonParseError extends Error {
  /** 出错字符在原始输入中的偏移量 */
  offset: number;
  /** 出错行号（从 1 开始） */
  line: number;
  /** 出错列号（从 1 开始） */
  column: number;

  constructor(message: string, offset: number, line: number, column: number) {
    super(message);
    this.name = 'JsonParseError';
    this.offset = offset;
    this.line = line;
    this.column = column;
  }
}

/** 根据源文本与偏移量计算行列信息 */
function locate(source: string, offset: number): { line: number, column: number } {
  const before = source.slice(0, offset);
  return {
    line: (before.match(/\n/g)?.length ?? 0) + 1,
    column: offset - (before.lastIndexOf('\n') + 1) + 1,
  };
}

export interface ParseOptions {
  /** 是否允许注释（// 与 /* *\/），默认 true */
  allowComments?: boolean;
  /** 是否允许单引号字符串，默认 true */
  allowSingleQuotes?: boolean;
  /** 是否允许尾随逗号，默认 true */
  allowTrailingCommas?: boolean;
}

/**
 * 预处理：去掉注释（以空格占位保持偏移量不变）、将非法转义替换为 unicode 形式、单引号字符串转为双引号；
 * 返回转换后的文本以及 “新位置 -> 原位置” 的映射表
 */
function preprocess(text: string, opts: Required<ParseOptions>): { out: string; map: number[] } {
  let out = '';
  const map: number[] = [];
  let i = 0;
  const n = text.length;
  // push 一个字符并记录其来源位置
  const emit = (s: string, from: number) => {
    for (const c of s) { out += c; map.push(from); }
  };
  while (i < n) {
    const ch = text[i];
    // 字符串内部原样保留（仅处理定界符与转义）
    if (ch === '"' || (opts.allowSingleQuotes && ch === "'")) {
      const quote = ch;
      // 单引号字符串转为标准双引号字符串
      emit('"', i);
      i++;
      while (i < n) {
        const c = text[i];
        if (c === '\\' && i + 1 < n) {
          // 非法转义（如 \xx）转为 unicode 形式，避免 JSON.parse 直接报错
          const next = text[i + 1];
          if (!'bfnrt"\\/u'.includes(next)) {
            emit('\\u' + next.charCodeAt(0).toString(16).padStart(4, '0'), i);
          } else {
            emit(c + next, i);
          }
          i += 2;
          continue;
        }
        if (quote === "'") {
          if (c === '"') emit('\\"', i);
          else if (c === "'") emit('"', i);
          else emit(c, i);
          i++;
          if (c === "'") break;
          continue;
        }
        emit(c, i);
        i++;
        if (c === quote) break;
      }
      continue;
    }
    // 注释：用空格替换（保留换行），保证出错位置与原文一致
    if (opts.allowComments && ch === '/' && i + 1 < n) {
      if (text[i + 1] === '/') {
        while (i < n && text[i] !== '\n') { emit(' ', i); i++; }
        continue;
      }
      if (text[i + 1] === '*') {
        emit('  ', i);
        i += 2;
        while (i < n && !(text[i] === '*' && text[i + 1] === '/')) {
          emit(text[i] === '\n' ? '\n' : ' ', i);
          i++;
        }
        if (i < n) { emit('  ', i); i += 2; }
        continue;
      }
    }
    emit(ch, i);
    i++;
  }
  return { out, map };
}

/**
 * 移除字符串外的尾随逗号（`, }` 与 `, ]`），删除处补空格以保持偏移量；同步维护位置映射表。
 * 同时把不带引号的键（如 JS 对象字面量 a: 1 / 'a': 1）自动补上双引号。
 */
function normalizeStructure(text: string, map: number[]): { out: string; map: number[] } {
  let out = '';
  const newMap: number[] = [];
  let i = 0;
  const n = text.length;
  let depth = 0;               // 当前容器深度
  let inObjCtx = false;        // 当前容器是否为对象
  let expectKey = false;       // 是否处于“期望键名”的位置
  let keyStart = -1;           // 裸键起始位置（-1 表示无）
  let keyIsStr = false;        // 起始字符是否为字符串定界符
  const isWs = (c?: string) => c === undefined || /\s/.test(c);
  const emit = (s: string, at: number) => {
    for (const c of s) { out += c; newMap.push(map[at]); }
  };
  /** 结束当前键区域：若为裸标识符则补引号 */
  const closeKey = (endExclusive: number) => {
    if (keyStart >= 0 && !keyIsStr) {
      const raw = text.slice(keyStart, endExclusive).trim();
      if (/^[\w$\u4e00-\u9fa5][\w$\u4e00-\u9fa5-]*$/.test(raw)) {
        emit(`"${raw}"`, keyStart);
      } else {
        emit(text.slice(keyStart, endExclusive), keyStart);
      }
    }
    keyStart = -1;
  };
  while (i < n) {
    const ch = text[i];
    // 字符串：整体拷贝
    if (ch === '"' || ch === "'") {
      if (keyStart < 0 && expectKey) { keyStart = i; keyIsStr = true; }
      const quote = ch;
      emit(ch, i);
      i++;
      while (i < n) {
        const c = text[i];
        emit(c, i);
        i++;
        if (c === '\\' && i < n) { emit(text[i], i - 1); i++; continue; }
        if (c === quote) break;
      }
      continue;
    }
    // 结构符号
    if (ch === '{' || ch === '[') {
      closeKey(i);
      emit(ch, i);
      depth++;
      inObjCtx = ch === '{';
      expectKey = ch === '{';
      i++;
      continue;
    }
    if (ch === '}' || ch === ']') {
      closeKey(i);
      // 回退输出末尾的空白以紧贴？不必，保持原样即可
      emit(ch, i);
      depth = Math.max(depth - 1, 0);
      expectKey = false;
      i++;
      continue;
    }
    if (ch === ':') {
      closeKey(i);
      emit(ch, i);
      expectKey = false;
      i++;
      continue;
    }
    if (ch === ',') {
      closeKey(i);
      // 尾随逗号检测：向后跳过空白，遇到 }/] 则替换为空格
      let j = i + 1;
      while (j < n && isWs(text[j])) j++;
      if (text[j] === '}' || text[j] === ']') {
        emit(' ', i);
      } else {
        emit(ch, i);
      }
      expectKey = inObjCtx;
      i++;
      continue;
    }
    // 其他字符（含空白/数字等）
    if (keyStart < 0 && !isWs(ch) && expectKey) {
      keyStart = i;
      keyIsStr = false;
    }
    emit(ch, i);
    i++;
  }
  return { out, map: newMap };
}

/**
 * 宽松解析 JSON 文本为 JS 值。
 * 支持注释、单引号、尾随逗号；失败时抛出携带行列信息的 JsonParseError。
 */
export function parseJsonLoose(text: string, options: ParseOptions = {}): JsonValue {
  const opts = {
    allowComments: options.allowComments ?? true,
    allowSingleQuotes: options.allowSingleQuotes ?? true,
    allowTrailingCommas: options.allowTrailingCommas ?? true,
  };
  // 记录 trim 的前导偏移，保证行列号对应原始输入
  const lead = text.length - text.trimStart().length;
  const src = text.trim();
  if (!src) {
    const pos = locate(text, Math.min(lead, text.length));
    throw new JsonParseError('内容为空', Math.min(lead, text.length), pos.line, pos.column);
  }
  let { out: prepared, map } = preprocess(src, opts);
  ({ out: prepared, map } = normalizeStructure(prepared, map));
  try {
    return JSON.parse(prepared) as JsonValue;
  } catch (e: any) {
    // 提取原生错误中的位置信息（Chrome: "... position 12" / SpiderMonkey: "line X column Y"）
    let offset = 0;
    const msg: string = e?.message ?? '';
    const posMatch = /position (\d+)/i.exec(msg);
    if (posMatch) {
      offset = Number(posMatch[1]);
    } else {
      const lcMatch = /line (\d+) column (\d+)/i.exec(msg);
      if (lcMatch) {
        const lines = prepared.split('\n');
        const line = Math.min(Number(lcMatch[1]), lines.length);
        offset = lines.slice(0, line - 1).reduce((acc, l) => acc + l.length + 1, 0) + Number(lcMatch[2]) - 1;
      }
    }
    offset = Math.min(Math.max(offset, 0), Math.max(prepared.length - 1, 0));
    // 通过映射表还原到原始输入中的位置
    const origOffset = lead + (map[offset] ?? src.length - 1);
    const { line, column } = locate(text, origOffset);
    const at = text[origOffset];
    const message = at === undefined
      ? 'JSON 语法错误：内容意外结束'
      : `JSON 语法错误：第 ${origOffset + 1} 个字符附近的 "${/[{}\[\],:\s]/.test(at) ? at.trim() || '空白' : at}" 存在语法问题`;
    throw new JsonParseError(message, origOffset, line, column);
  }
}

/* --------------------------- 序列化 --------------------------- */

export type SortType = 'none' | 'asc' | 'desc' | 'natural';

/** 缩进字符类型：空格 / Tab */
export type IndentChar = 'space' | 'tab';

export interface FormatOptions {
  /** 缩进字符（空格或 Tab） */
  indentChar: IndentChar;
  /** 缩进尺寸：空格时为每级空格数；Tab 时为每个 Tab 宽度对应的空格数（用于树形视图对齐），0 表示压缩为一行 */
  indentSize: number;
  /** 排序方式 */
  sortType: SortType;
}

/** 递归排序对象键 */
export function sortJsonKeys(value: JsonValue, type: SortType): JsonValue {
  if (type === 'none') return value;
  if (Array.isArray(value)) return value.map(v => sortJsonKeys(v, type));
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (type === 'desc') {
      keys.sort((a, b) => b.localeCompare(a, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' }));
    } else {
      keys.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' }));
    }
    const result: JsonObject = {};
    keys.forEach(k => result[k] = sortJsonKeys((value as JsonObject)[k], type));
    return result;
  }
  return value;
}

/**
 * 将值序列化为格式化 JSON 字符串
 * @param value JS 值
 * @param opts 格式化选项
 */
export function stringifyJson(value: JsonValue, opts: FormatOptions): string {
  const sorted = sortJsonKeys(value, opts.sortType);
  if (opts.indentSize <= 0) return JSON.stringify(sorted);
  // Tab 缩进时 JSON.stringify 的 size 参数被忽略，固定为 1 个 Tab
  if (opts.indentChar === 'tab') return JSON.stringify(sorted, null, '\t');
  return JSON.stringify(sorted, null, opts.indentSize);
}

/* --------------------------- 统计信息 --------------------------- */

export interface JsonStats {
  nodes: number;        // 节点总数（含容器与叶子）
  objects: number;      // 对象个数
  arrays: number;       // 数组个数
  keys: number;         // 键个数
  strings: number;      // 字符串值个数
  numbers: number;      // 数字值个数
  booleans: number;     // 布尔值个数
  nulls: number;        // null 值个数
  maxDepth: number;     // 最大嵌套深度
}

/**
 * 遍历 JSON 值收集统计信息
 */
export function analyzeJson(value: JsonValue): JsonStats {
  const stats: JsonStats = {
    nodes: 0, objects: 0, arrays: 0, keys: 0,
    strings: 0, numbers: 0, booleans: 0, nulls: 0, maxDepth: 0,
  };
  const walk = (v: JsonValue, depth: number) => {
    stats.nodes++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    if (v === null) { stats.nulls++; return; }
    if (typeof v === 'string') { stats.strings++; return; }
    if (typeof v === 'number') { stats.numbers++; return; }
    if (typeof v === 'boolean') { stats.booleans++; return; }
    if (Array.isArray(v)) {
      stats.arrays++;
      v.forEach(item => walk(item, depth + 1));
      return;
    }
    stats.objects++;
    stats.keys += Object.keys(v).length;
    Object.values(v).forEach(item => walk(item, depth + 1));
  };
  walk(value, 1);
  return stats;
}

/* --------------------------- 树形展示 --------------------------- */

export interface JsonTreeNode {
  /** 当前节点的路径（点分，如 $.users.0.name） */
  path: string;
  /** 显示用的键名（数组元素为下标） */
  key: string;
  /** 原始值 */
  value: JsonValue;
  isObject: boolean;
  isArray: boolean;
  childCount: number;
  depth: number;
}

/**
 * 将 JSON 值展开为树节点列表（用于逐行渲染；折叠节点的子级不输出）
 * @param value JSON 值
 * @param collapsed 已折叠路径集合
 * @param path 当前节点路径
 */
export function flattenTree(value: JsonValue, collapsed: Set<string>, path = '$'): JsonTreeNode[] {
  const nodes: JsonTreeNode[] = [];
  const walkNode = (key: string, v: JsonValue, nodePath: string, depth: number) => {
    const isObj = !!v && typeof v === 'object' && !Array.isArray(v);
    const isArr = Array.isArray(v);
    const children: [string, JsonValue][] = isObj
      ? Object.entries(v as JsonObject)
      : isArr
        ? (v as JsonArray).map((x, i) => [String(i), x as JsonValue])
        : [];
    nodes.push({ path: nodePath, key, value: v, isObject: isObj, isArray: isArr, childCount: children.length, depth });
    if (collapsed.has(nodePath)) return;
    children.forEach(([ck, cv]) => walkNode(ck, cv, `${nodePath}.${ck}`, depth + 1));
  };
  if (value !== null && typeof value === 'object') {
    walkNode('', value, path, 0);
  } else {
    nodes.push({ path, key: '', value, isObject: false, isArray: false, childCount: 0, depth: 0 });
  }
  return nodes;
}

/**
 * 按点分路径取值，如 getJsonValue(data, '$.users.0.name')；取不到返回 undefined
 */
export function getJsonValue(value: JsonValue, path: string): JsonValue | undefined {
  if (!path || path === '$') return value;
  if (!path.startsWith('$.')) return undefined;
  let curr: any = value;
  for (const seg of path.slice(2).split('.')) {
    if (curr === null || typeof curr !== 'object') return undefined;
    curr = curr[seg];
  }
  return curr as JsonValue | undefined;
}

/**
 * 收集所有可折叠容器节点的路径（对象/数组且非空）
 */
export function collectContainerPaths(value: JsonValue, path = '$'): string[] {
  const res: string[] = [];
  const walk = (v: JsonValue, p: string) => {
    if (v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      if (v.length) res.push(p);
      v.forEach((x, i) => walk(x, `${p}.${i}`));
      return;
    }
    const entries = Object.entries(v as JsonObject);
    if (entries.length) res.push(p);
    entries.forEach(([k, x]) => walk(x, `${p}.${k}`));
  };
  walk(value, path);
  return res;
}
