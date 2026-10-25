// JWT 加解密核心逻辑，基于 Web Crypto API 实现，所有计算均在浏览器本地完成

/** JWT 头部 */
export interface JwtHeader {
  alg: string;
  typ?: string;
  [key: string]: unknown;
}

/** JWT 载荷 */
export interface JwtPayload {
  exp?: number;
  iat?: number;
  nbf?: number;
  [key: string]: unknown;
}

/** 解析结果 */
export interface JwtParsed {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string; // base64url 原文
  signingInput: string; // header.payload 部分
}

/** 签名算法选项 */
export interface AlgOption {
  value: string;
  label: string;
  desc: string;
  /** HMAC 哈希名，None 表示不签名 */
  hash?: string;
}

export const ALG_OPTIONS: AlgOption[] = [
  { value: 'HS256', label: 'HS256', desc: 'HMAC + SHA-256（常用）', hash: 'SHA-256' },
  { value: 'HS384', label: 'HS384', desc: 'HMAC + SHA-384', hash: 'SHA-384' },
  { value: 'HS512', label: 'HS512', desc: 'HMAC + SHA-512', hash: 'SHA-512' },
];

/* ------------------------- base64url 编解码 ------------------------- */

/** 字节数组 -> base64url 字符串 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url 字符串 -> 字节数组 */
export function base64UrlToBytes(str: string): Uint8Array<ArrayBuffer> {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** UTF-8 字符串 -> base64url */
export function strToBase64Url(str: string): string {
  return bytesToBase64Url(new TextEncoder().encode(str));
}

/** base64url -> UTF-8 字符串 */
export function base64UrlToStr(str: string): string {
  return new TextDecoder().decode(base64UrlToBytes(str));
}

/* ------------------------- JSON 工具 ------------------------- */

/** 将任意值转为可读 JSON 字符串（非字符串则尝试解析后格式化） */
export function prettyJson(value: unknown): string {
  if (typeof value !== 'string') return JSON.stringify(value, null, 2);
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

/** 安全解析 JSON，失败返回 undefined */
export function safeJsonParse<T = unknown>(str: string): T | undefined {
  try {
    return JSON.parse(str) as T;
  } catch {
    return undefined;
  }
}

/* ------------------------- JWT 解析 ------------------------- */

/**
 * 解析 JWT 字符串（不校验签名）
 * @throws {Error} 格式非法时抛出异常
 */
export function parseJwt(token: string): JwtParsed {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('JWT 格式非法：应为 header.payload.signature 三段结构');
  const decodePart = (b64: string, name: string) => {
    if (!b64) throw new Error(`JWT ${name} 段为空`);
    let obj: unknown;
    try {
      obj = JSON.parse(base64UrlToStr(b64));
    } catch {
      throw new Error(`JWT ${name} 段解码失败：不是合法的 base64url JSON`);
    }
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new Error(`JWT ${name} 段应为 JSON 对象`);
    }
    return obj;
  };
  return {
    header: decodePart(parts[0], 'header') as JwtHeader,
    payload: decodePart(parts[1], 'payload') as JwtPayload,
    signature: parts[2],
    signingInput: `${parts[0]}.${parts[1]}`,
  };
}

/* ------------------------- HMAC 签名 ------------------------- */

async function importHmacKey(secret: string, hash: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign', 'verify']
  );
}

/** 使用 HMAC 对数据签名，返回 base64url 签名串 */
export async function hmacSign(data: string, secret: string, hash: string): Promise<string> {
  const key = await importHmacKey(secret, hash);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
}

/** 使用 HMAC 验证签名是否匹配 */
export async function hmacVerify(data: string, signatureB64Url: string, secret: string, hash: string): Promise<boolean> {
  const key = await importHmacKey(secret, hash);
  try {
    return await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signatureB64Url),
      new TextEncoder().encode(data)
    );
  } catch {
    return false;
  }
}

/* ------------------------- JWT 生成 ------------------------- */

export interface BuildOptions {
  header: JwtHeader;
  payload: JwtPayload;
  secret: string;
}

/** 根据头部、载荷与密钥构建完整 JWT 字符串 */
export async function buildJwt({ header, payload, secret }: BuildOptions): Promise<string> {
  const h = strToBase64Url(JSON.stringify(header));
  const p = strToBase64Url(JSON.stringify(payload));
  const signingInput = `${h}.${p}`;
  if (header.alg === 'none') return `${signingInput}.`;
  const algInfo = ALG_OPTIONS.find(a => a.value === header.alg);
  if (!algInfo?.hash) throw new Error(`暂不支持的签名算法：${header.alg}`);
  if (!secret) throw new Error('请输入签名密钥');
  const s = await hmacSign(signingInput, secret, algInfo.hash);
  return `${signingInput}.${s}`;
}

/* ------------------------- 时间声明处理 ------------------------- */

/** 注册声明字段顺序 */
const CLAIM_ORDER = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'];

/**
 * 向载荷中注入/更新 exp、nbf、iat 等时间声明
 * @param payload 原始载荷对象
 * @param opts seconds - 相对当前时间的秒数；enabled - 是否启用该字段
 */
export function applyTimeClaims(
  payload: JwtPayload,
  opts: {
    exp: { enabled: boolean; seconds: number };
    nbf: { enabled: boolean; seconds: number };
    iat: { enabled: boolean };
  }
): JwtPayload {
  const nowSec = Math.floor(Date.now() / 1000);
  const result: JwtPayload = {};
  // 先保留非时间类字段
  Object.entries(payload).forEach(([k, v]) => {
    if (!CLAIM_ORDER.includes(k)) result[k] = v;
  });
  if (opts.iat.enabled) result.iat = nowSec;
  if (opts.nbf.enabled) result.nbf = nowSec + opts.nbf.seconds;
  if (opts.exp.enabled) result.exp = nowSec + opts.exp.seconds;
  // 按常见顺序重排时间声明
  const ordered: JwtPayload = {};
  CLAIM_ORDER.forEach(k => {
    if (k in result) ordered[k] = result[k];
  });
  Object.entries(result).forEach(([k, v]) => {
    if (!(k in ordered)) ordered[k] = v;
  });
  return ordered;
}

/** 秒数转可读时长，如 7200 -> 2小时 */
export function secondsToReadable(seconds: number): string {
  const abs = Math.abs(seconds);
  const units: [number, string][] = [
    [86400, '天'],
    [3600, '小时'],
    [60, '分钟'],
    [1, '秒'],
  ];
  const parts: string[] = [];
  let rest = abs;
  for (const [val, name] of units) {
    const n = Math.floor(rest / val);
    if (n > 0) {
      parts.push(`${n}${name}`);
      rest -= n * val;
    }
    if (rest <= 0) break;
  }
  if (!parts.length) return '0秒';
  return (seconds < 0 ? '-' : '') + parts.join('');
}

/** Unix 秒级时间戳格式化 */
export function formatUnix(sec: number): string {
  return new Date(sec * 1000).format('yyyy-MM-dd HH:mm:ss');
}

/** 判断 exp 状态：expired / valid / none */
export function expStatus(exp: unknown): 'expired' | 'valid' | 'none' {
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return 'none';
  return exp * 1000 < Date.now() ? 'expired' : 'valid';
}
