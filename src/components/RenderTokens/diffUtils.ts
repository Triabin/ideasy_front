/** 文本Diff核心算法：行级LCS差异计算 + 词级内联高亮 */

/** 单侧行号（从1开始，null表示该侧无对应行） */
export type SideLine = { no: number | null; text: string };

/** 归一化后的Diff行（左右对齐展示用） */
export type NormRow = {
  /** equal-相同 / insert-新增 / delete-删除 / replace-修改 */
  type: 'equal' | 'insert' | 'delete' | 'replace';
  left: SideLine;
  right: SideLine;
};

/** Diff统计信息 */
export type DiffStats = {
  added: number;
  deleted: number;
  modified: number;
  unchanged: number;
  totalRows: number;
};

/** 词级token：text-普通文本 / ws-空白 / changed-变更片段 */
export type InlineToken = { kind: 'text' | 'ws' | 'changed'; text: string };

/**
 * 计算两个字符串序列的LCS匹配对（动态规划，O(n*m)，n/m为行数）
 * @param a 左侧行数组
 * @param b 右侧行数组
 * @returns 匹配上的行下标对列表（升序）
 */
export function lcsMatches(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length;
  const m = b.length;
  // dp[i][j]：a[i..]与b[j..]的LCS长度
  const dp: Uint32Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i++) dp[i] = new Uint32Array(m + 1);
  for (let i = n - 1; i >= 0; i--) {
    const cur = dp[i];
    const next = dp[i + 1];
    const ai = a[i];
    for (let j = m - 1; j >= 0; j--) {
      cur[j] = ai === b[j] ? next[j + 1] + 1 : Math.max(next[j], cur[j + 1]);
    }
  }
  // 回溯求匹配对
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/**
 * 由LCS匹配对生成操作序列（keep/insert/delete）
 */
function buildOps(a: string[], b: string[]): Array<{ op: 'keep' | 'insert' | 'delete'; ai?: number; bj?: number }> {
  const ops: Array<{ op: 'keep' | 'insert' | 'delete'; ai?: number; bj?: number }> = [];
  let i = 0;
  let j = 0;
  for (const [pi, pj] of lcsMatches(a, b)) {
    while (i < pi) ops.push({ op: 'delete', ai: i++ });
    while (j < pj) ops.push({ op: 'insert', bj: j++ });
    ops.push({ op: 'keep', ai: i, bj: j });
    i++;
    j++;
  }
  while (i < a.length) ops.push({ op: 'delete', ai: i++ });
  while (j < b.length) ops.push({ op: 'insert', bj: j++ });
  return ops;
}

/**
 * 将操作序列合并相邻的delete/insert块为replace，并左右对齐生成规范化行
 */
function alignRows(ops: Array<{ op: 'keep' | 'insert' | 'delete'; ai?: number; bj?: number }>, a: string[], b: string[]): NormRow[] {
  // 1. 分块：连续的delete与insert合并为一个hunk
  type Hunk = { type: 'equal' | 'insert' | 'delete' | 'replace'; leftIdx: number[]; rightIdx: number[] };
  const hunks: Hunk[] = [];
  let curDel: number[] = [];
  let curIns: number[] = [];
  const flush = () => {
    if (!curDel.length && !curIns.length) return;
    if (curDel.length && curIns.length) {
      hunks.push({ type: 'replace', leftIdx: curDel, rightIdx: curIns });
    } else if (curDel.length) {
      hunks.push({ type: 'delete', leftIdx: curDel, rightIdx: [] });
    } else {
      hunks.push({ type: 'insert', leftIdx: [], rightIdx: curIns });
    }
    curDel = [];
    curIns = [];
  };
  for (const op of ops) {
    if (op.op === 'keep') {
      flush();
      hunks.push({ type: 'equal', leftIdx: [op.ai!], rightIdx: [op.bj!] });
    } else if (op.op === 'delete') {
      curDel.push(op.ai!);
    } else {
      curIns.push(op.bj!);
    }
  }
  flush();

  // 2. hunk内部左右对齐成行
  const rows: NormRow[] = [];
  for (const h of hunks) {
    const maxLen = Math.max(h.leftIdx.length, h.rightIdx.length);
    if (h.type === 'equal') {
      const li = h.leftIdx[0];
      const ri = h.rightIdx[0];
      rows.push({ type: 'equal', left: { no: li + 1, text: a[li] }, right: { no: ri + 1, text: b[ri] } });
      continue;
    }
    for (let t = 0; t < maxLen; t++) {
      const li = h.leftIdx[t];
      const ri = h.rightIdx[t];
      const left: SideLine = li === undefined ? { no: null, text: '' } : { no: li + 1, text: a[li] };
      const right: SideLine = ri === undefined ? { no: null, text: '' } : { no: ri + 1, text: b[ri] };
      rows.push({ type: h.type, left, right });
    }
  }
  return rows;
}

/**
 * 行级Diff主入口
 * @param leftText 左文本
 * @param rightText 右文本
 * @param ignoreWs 是否忽略行首尾空白差异
 * @param ignoreCase 是否忽略大小写
 */
export function diffLines(
  leftText: string,
  rightText: string,
  opts: { ignoreWs?: boolean; ignoreCase?: boolean } = {}
): { rows: NormRow[]; stats: DiffStats } {
  const normalize = (s: string) => {
    let t = opts.ignoreWs ? s.trim() : s;
    if (opts.ignoreCase) t = t.toLowerCase();
    return t;
  };
  const rawLeft = splitLines(leftText);
  const rawRight = splitLines(rightText);
  const a = rawLeft.map(normalize);
  const b = rawRight.map(normalize);

  const rows = alignRows(buildOps(a, b), rawLeft, rawRight);

  const stats: DiffStats = { added: 0, deleted: 0, modified: 0, unchanged: 0, totalRows: rows.length };
  for (const r of rows) {
    switch (r.type) {
      case 'equal':
        stats.unchanged++;
        break;
      case 'insert':
        stats.added++;
        break;
      case 'delete':
        stats.deleted++;
        break;
      case 'replace':
        stats.modified++;
        break;
    }
  }
  return { rows, stats };
}

/** 按换行符拆分文本 */
function splitLines(text: string): string[] {
  if (text === '') return [];
  return text.replace(/\r\n?/g, '\n').split('\n');
}

/**
 * 词级tokenize：非空白连续字符为一个token，空白串为一个token
 */
function tokenize(s: string): string[] {
  return s.split(/(\s+)/).filter(t => t !== '');
}

/**
 * 计算一行相对另一行的词级变更高亮token（只返回本侧自己的内容）
 * 关键修正：LCS匹配对必须按"本侧token在前"传入（buildOps(a=self, b=other)），
 * 否则ops序列会把对侧的insert token误拼进本侧文本，导致左右显示相同且内容错乱。
 * @param self 本侧文本
 * @param other 对侧文本
 */
export function inlineTokens(self: string, other: string): InlineToken[] {
  const ta = tokenize(self);
  const tb = tokenize(other);
  // a=本侧、b=对侧：delete表示本侧独有的变更片段，keep表示两侧相同部分；
  // 遍历ops时只输出属于本侧（ta）的token，对侧独有内容一律忽略。
  const ops = buildOps(ta, tb);
  const out: InlineToken[] = [];
  const push = (text: string, kind: InlineToken['kind']) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  for (const op of ops) {
    if (op.op === 'insert') continue; // 对侧独有内容，不属于本侧行
    const text = ta[op.ai!];
    if (op.op === 'keep') push(text, isWs(text) ? 'ws' : 'text');
    else push(text, 'changed');
  }
  return out;
}

function isWs(s: string): boolean {
  return /^\s+$/.test(s);
}
