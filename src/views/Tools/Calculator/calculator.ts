/**
 * 在线计算器表达式引擎：分词 + 递归下降解析求值。
 * 不使用 eval，所有函数与运算符均为白名单实现，安全可控。
 */

/** 角度单位：DEG（角度）/ RAD（弧度） */
export type AngleUnit = 'DEG' | 'RAD';

/** 计算错误（message 为用户可读的中文提示） */
export class CalcError extends Error {}

/** 词法单元 */
type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string };

/** 支持的函数名（白名单） */
const FUNCTION_NAMES = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'cbrt', 'abs']);

/** 常量表 */
const CONSTANTS: Record<string, number> = { 'π': Math.PI, pi: Math.PI, e: Math.E };

/** 运算符字符归一化（展示符号 → 内部符号） */
const OP_ALIAS: Record<string, string> = { '×': '*', '÷': '/', '−': '-', '–': '-' };

/** 数字匹配（支持小数与科学计数法） */
const NUM_RE = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
/** 标识符匹配（函数名、常量名、π） */
const IDENT_RE = /^[a-zA-Zπ]+/;
/** 合法运算符字符集合 */
const OP_CHARS = '+-*/^%!()√';
/**
 * 编辑用分词（宽松模式，非法字符按单字符处理，不会抛错）。
 * 函数名与其左括号（如 sin(）合并为一个词法单元，便于整体退格。
 */
const EDIT_TOKEN_RE = /\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+|[a-zA-Zπ]+\(?|[\s\S]/g;
/** 纯数字文本判断（含小数与科学计数法） */
const NUM_TEXT_RE = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * 函数描述：分词
 * @param src {string} 表达式文本
 * @return { Token[] } 词法单元列表
 */
export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let rest = src;
  while (rest.length) {
    const ch = rest[0];
    if (ch === ' ' || ch === '\t') {
      rest = rest.slice(1);
      continue;
    }
    const num = NUM_RE.exec(rest);
    if (num) {
      tokens.push({ type: 'num', value: parseFloat(num[0]) });
      rest = rest.slice(num[0].length);
      continue;
    }
    const ident = IDENT_RE.exec(rest);
    if (ident) {
      tokens.push({ type: 'ident', value: ident[0] });
      rest = rest.slice(ident[0].length);
      continue;
    }
    const op = OP_ALIAS[ch] ?? ch;
    if (OP_CHARS.includes(op)) {
      tokens.push({ type: 'op', value: op });
      rest = rest.slice(1);
      continue;
    }
    throw new CalcError(`无法识别的字符「${ch}」`);
  }
  return tokens;
}

/** 递归下降解析器 */
class Parser {
  /** 当前读取位置 */
  private pos = 0;
  /** 词法单元列表 */
  private readonly tokens: Token[];
  /** 角度单位（影响三角函数） */
  private readonly angle: AngleUnit;

  /**
   * @param tokens {Token[]} 词法单元列表
   * @param angle {AngleUnit} 角度单位（影响三角函数）
   */
  constructor(tokens: Token[], angle: AngleUnit) {
    this.tokens = tokens;
    this.angle = angle;
  }

  /**
   * 函数描述：解析整个表达式
   * @return { number } 计算结果
   */
  parse(): number {
    const value = this.parseExpression();
    if (this.pos < this.tokens.length) throw new CalcError('表达式格式有误，存在多余内容');
    return value;
  }

  /** 读取当前词法单元（不消费） */
  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  /**
   * 当前是否为指定运算符
   * @param value {string} 运算符
   */
  private isOp(value: string): boolean {
    const t = this.peek();
    return !!t && t.type === 'op' && t.value === value;
  }

  /**
   * 消费一个必需运算符，缺失时报错
   * @param value {string} 运算符
   */
  private eatOp(value: string) {
    if (!this.isOp(value)) throw new CalcError('表达式不完整');
    this.pos++;
  }

  /** 加减层 */
  private parseExpression(): number {
    let value = this.parseTerm();
    for (;;) {
      if (this.isOp('+')) {
        this.pos++;
        value += this.parseTerm();
      } else if (this.isOp('-')) {
        this.pos++;
        value -= this.parseTerm();
      } else {
        return value;
      }
    }
  }

  /** 乘除层（含隐式乘法，如 2π、3(4+5)） */
  private parseTerm(): number {
    let value = this.parseUnary();
    for (;;) {
      if (this.isOp('*') || this.isOp('/')) {
        const isDiv = this.isOp('/');
        this.pos++;
        const right = this.parseUnary();
        if (isDiv && right === 0) throw new CalcError('除数不能为零');
        value = isDiv ? value / right : value * right;
      } else if (this.startsOperand()) {
        value *= this.parseUnary();
      } else {
        return value;
      }
    }
  }

  /** 当前位置是否能开始一个新操作数（用于隐式乘法判断） */
  private startsOperand(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.type === 'num' || t.type === 'ident') return true;
    return t.type === 'op' && (t.value === '(' || t.value === '√');
  }

  /** 正负号层 */
  private parseUnary(): number {
    if (this.isOp('-')) {
      this.pos++;
      return -this.parseUnary();
    }
    if (this.isOp('+')) {
      this.pos++;
      return this.parseUnary();
    }
    return this.parsePower();
  }

  /** 幂运算层（右结合：2^3^2 = 2^9） */
  private parsePower(): number {
    const base = this.parsePostfix();
    if (this.isOp('^')) {
      this.pos++;
      const exp = this.parseUnary();
      const value = Math.pow(base, exp);
      if (Number.isNaN(value)) throw new CalcError('幂运算结果无意义');
      return value;
    }
    return base;
  }

  /** 后缀运算层（阶乘 !、百分号 %） */
  private parsePostfix(): number {
    let value = this.parsePrimary();
    for (;;) {
      if (this.isOp('!')) {
        this.pos++;
        value = factorial(value);
      } else if (this.isOp('%')) {
        this.pos++;
        value /= 100;
      } else {
        return value;
      }
    }
  }

  /** 基础操作数层 */
  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new CalcError('表达式不完整');
    if (t.type === 'num') {
      this.pos++;
      return t.value;
    }
    if (t.type === 'ident') {
      this.pos++;
      const name = t.value;
      if (name in CONSTANTS) return CONSTANTS[name];
      if (!FUNCTION_NAMES.has(name)) throw new CalcError(`未知的函数或常量「${name}」`);
      this.eatOp('(');
      const arg = this.parseExpression();
      this.eatOp(')');
      return this.applyFunction(name, arg);
    }
    if (t.type === 'op' && t.value === '(') {
      this.pos++;
      const value = this.parseExpression();
      this.eatOp(')');
      return value;
    }
    if (t.type === 'op' && t.value === '√') {
      this.pos++;
      const value = this.parsePrimary();
      if (value < 0) throw new CalcError('负数不能开平方');
      return Math.sqrt(value);
    }
    throw new CalcError('表达式格式有误');
  }

  /**
   * 应用函数
   * @param name {string} 函数名
   * @param arg {number} 参数
   */
  private applyFunction(name: string, arg: number): number {
    switch (name) {
      case 'sin':
        return Math.sin(this.toRad(arg));
      case 'cos':
        return Math.cos(this.toRad(arg));
      case 'tan': {
        const rad = this.toRad(arg);
        // tan(90° + 180°k) 无定义
        if (Math.abs(Math.cos(rad)) < 1e-12) throw new CalcError('正切函数在该角度无定义');
        return Math.tan(rad);
      }
      case 'asin': {
        if (arg < -1 || arg > 1) throw new CalcError('反正弦的定义域为 [-1, 1]');
        return this.fromRad(Math.asin(arg));
      }
      case 'acos': {
        if (arg < -1 || arg > 1) throw new CalcError('反余弦的定义域为 [-1, 1]');
        return this.fromRad(Math.acos(arg));
      }
      case 'atan':
        return this.fromRad(Math.atan(arg));
      case 'ln': {
        if (arg <= 0) throw new CalcError('对数的参数必须大于 0');
        return Math.log(arg);
      }
      case 'log': {
        if (arg <= 0) throw new CalcError('对数的参数必须大于 0');
        return Math.log10(arg);
      }
      case 'sqrt': {
        if (arg < 0) throw new CalcError('负数不能开平方');
        return Math.sqrt(arg);
      }
      case 'cbrt':
        return Math.cbrt(arg);
      case 'abs':
        return Math.abs(arg);
      default:
        throw new CalcError(`未知的函数「${name}」`);
    }
  }

  /**
   * 角度转弧度
   * @param x {number} 角度值
   */
  private toRad(x: number): number {
    return this.angle === 'DEG' ? (x * Math.PI) / 180 : x;
  }

  /**
   * 弧度转角度
   * @param x {number} 弧度值
   */
  private fromRad(x: number): number {
    return this.angle === 'DEG' ? (x * 180) / Math.PI : x;
  }
}

/**
 * 函数描述：阶乘
 * @param n {number} 非负整数（最大 170）
 * @return { number } 阶乘结果
 */
function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new CalcError('阶乘仅支持非负整数');
  if (n > 170) throw new CalcError('阶乘参数过大（最大支持 170!）');
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * 函数描述：求值表达式
 * @param expr {string} 表达式文本（支持 ×、÷、√、π 等符号）
 * @param angle {AngleUnit} 角度单位
 * @return { number } 计算结果
 */
export function evaluate(expr: string, angle: AngleUnit = 'DEG'): number {
  const tokens = tokenize(expr);
  if (!tokens.length) throw new CalcError('表达式为空');
  return new Parser(tokens, angle).parse();
}

/**
 * 函数描述：格式化数值为展示文本（消除浮点误差，超大/超小数用科学计数法）
 * @param n {number} 数值
 * @return { string } 展示文本
 */
export function formatNumber(n: number): string {
  if (Number.isNaN(n)) throw new CalcError('结果无意义');
  if (!Number.isFinite(n)) throw new CalcError('结果超出可表示范围');
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e16 || abs < 1e-12) {
    return n.toExponential(8)
      .replace(/(\.\d*?)0+e/, '$1e')
      .replace(/\.e/, 'e');
  }
  // toPrecision(14) 消除二进制浮点误差（如 0.1 + 0.2 → 0.3）
  return String(parseFloat(n.toPrecision(14)));
}

/**
 * 函数描述：退格。数字逐位删除；函数名与其左括号（如 sin(）、常量、运算符等整体删除，
 * 避免产生非法中间态
 * @param src {string} 表达式文本
 * @return { string } 删除后的表达式
 */
export function backspace(src: string): string {
  const parts = src.match(EDIT_TOKEN_RE);
  if (!parts || !parts.length) return '';
  const last = parts[parts.length - 1];
  if (/^[\d.]/.test(last) && last.length > 1 && !/[eE]/.test(last)) {
    // 普通数字：删一位
    parts[parts.length - 1] = last.slice(0, -1);
  } else {
    // 科学计数法数字、函数（如 sin(）、常量、运算符：整体删除
    parts.pop();
  }
  return parts.join('');
}

/**
 * 函数描述：追加小数点，必要时自动补前导 0（如 "+" 后输入 "." → "+0."）；
 * 当前数字已含小数点或为科学计数法形式时忽略
 * @param src {string} 表达式文本
 * @return { string } 追加后的表达式
 */
export function appendDot(src: string): string {
  const parts = src.match(EDIT_TOKEN_RE);
  if (!parts || !parts.length) return '0.';
  const last = parts[parts.length - 1];
  if (/^\d/.test(last)) {
    return last.includes('.') || /[eE]/.test(last) ? src : src + '.';
  }
  return src + '0.';
}

/**
 * 函数描述：切换表达式末尾数字的正负号（5 → (-5)，(-5) → 5）
 * @param src {string} 表达式文本
 * @return { string } 切换后的表达式；末尾不是数字时原样返回
 */
export function toggleSign(src: string): string {
  const parts = src.match(EDIT_TOKEN_RE);
  if (!parts || !parts.length) return src;
  const n = parts.length;
  // 已被 (-x) 包裹则还原
  if (n >= 4 && parts[n - 4] === '(' && parts[n - 3] === '-' && NUM_TEXT_RE.test(parts[n - 2]) && parts[n - 1] === ')') {
    parts.splice(n - 4, 4, parts[n - 2]);
    return parts.join('');
  }
  if (NUM_TEXT_RE.test(parts[n - 1])) {
    parts.splice(n - 1, 1, '(-', parts[n - 1], ')');
    return parts.join('');
  }
  return src;
}

/**
 * 函数描述：补全表达式缺失的右括号（按 = 时容错）
 * @param src {string} 表达式文本
 * @return { string } 补全后的表达式
 */
export function autoClose(src: string): string {
  let open = 0;
  try {
    for (const t of tokenize(src)) {
      if (t.type !== 'op') continue;
      if (t.value === '(') open++;
      else if (t.value === ')') open--;
    }
  } catch {
    return src;
  }
  return open > 0 ? src + ')'.repeat(open) : src;
}

/**
 * 函数描述：将表达式转为展示格式（* → ×，/ → ÷）
 * @param src {string} 表达式文本
 * @return { string } 展示文本
 */
export function prettify(src: string): string {
  return src.replace(/\*/g, '×').replace(/\//g, '÷');
}
