<!-- 文本Diff工具路由页面 -->
<template>
  <div class="h-full max-h-full w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">文本Diff</h1>
    <p class="text-sm opacity-70 text-center">逐行比较两段文本差异，支持行号显示、词级高亮、忽略空白/大小写、并排与统一视图。</p>

    <!-- 输入区 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <textarea
          v-model="leftText"
          class="textarea textarea-md w-full h-40 resize-y font-mono text-sm"
          :class="{ 'textarea-error': !!tooLarge }"
          placeholder="原始文本（左侧 / 旧版本）"
          spellcheck="false"
      ></textarea>
      <textarea
          v-model="rightText"
          class="textarea textarea-md w-full h-40 resize-y font-mono text-sm"
          :class="{ 'textarea-error': !!tooLarge }"
          placeholder="对比文本（右侧 / 新版本）"
          spellcheck="false"
      ></textarea>
    </div>

    <!-- 选项栏 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body py-3 flex-row flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <div class="btn-group shrink-0">
          <button class="btn btn-sm" :class="viewMode === 'side' ? 'btn-primary' : ''" @click="viewMode = 'side'">并排</button>
          <button class="btn btn-sm" :class="viewMode === 'unified' ? 'btn-primary' : ''" @click="viewMode = 'unified'">统一</button>
        </div>
        <label class="label cursor-pointer gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" v-model="ignoreWs"/>
          <span>忽略首尾空白</span>
        </label>
        <label class="label cursor-pointer gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" v-model="ignoreCase"/>
          <span>忽略大小写</span>
        </label>
        <label class="label cursor-pointer gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" v-model="inlineHighlight"/>
          <span>词级高亮</span>
        </label>
        <label class="label cursor-pointer gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" v-model="collapseEqual"/>
          <span>折叠相同部分</span>
        </label>
        <div class="ml-auto flex items-center gap-3 shrink-0">
          <button class="btn btn-sm btn-primary" @click="swapSides">⇄ 交换</button>
          <button class="btn btn-sm" @click="clearAll">清空</button>
        </div>
      </div>
    </div>

    <div v-if="tooLarge" class="alert alert-warning text-sm py-2">{{ tooLarge }}</div>

    <!-- 统计信息 -->
    <div v-if="hasInput && !tooLarge" class="flex flex-wrap items-center gap-2 text-sm">
      <span class="badge badge-success badge-outline font-mono">+{{ stats.added }} 新增</span>
      <span class="badge badge-error badge-outline font-mono">-{{ stats.deleted }} 删除</span>
      <span class="badge badge-info badge-outline font-mono">~{{ stats.modified }} 修改</span>
      <span class="badge badge-ghost badge-outline font-mono">={{ stats.unchanged }} 相同</span>
      <span class="opacity-60 font-mono">共 {{ stats.totalRows }} 行</span>
      <template v-if="diffHunks.length">
        <span class="divider divider-horizontal mx-0"></span>
        <span class="opacity-60">差异块：</span>
        <button
            v-for="(h, i) in diffHunks"
            :key="i"
            class="btn btn-xs btn-outline font-mono"
            :title="`跳转到第 ${i + 1} 个差异块（左行 ${h.ln ?? '-'} / 右行 ${h.rn ?? '-'}）`"
            @click="scrollToRow(h.rowIdx)"
        >#{{ i + 1 }}</button>
      </template>
    </div>

    <!-- Diff结果：并排视图 -->
    <div v-if="hasInput && !tooLarge && viewMode === 'side'" class="card bg-base-200 shadow-sm overflow-hidden">
      <div class="overflow-auto max-h-[60vh] font-mono text-[13px] leading-6">
        <table class="table w-full border-separate border-spacing-0">
          <thead class="sticky top-0 z-10">
          <tr class="bg-base-300 text-xs">
            <th class="w-12 px-2 text-right border-b border-base-content/10">原始行</th>
            <th class="border-b border-base-content/10 text-left pl-3">原始文本</th>
            <th class="w-12 px-2 text-right border-b border-base-content/10">对比行</th>
            <th class="border-b border-base-content/10 text-left pl-3">对比文本</th>
          </tr>
          </thead>
          <tbody>
          <template v-for="item in displayItems" :key="item.key">
            <tr v-if="item.kind === 'gap'" class="bg-base-300/60 text-center text-xs opacity-70">
              <td colspan="4" class="py-1 border-b border-base-content/5">⋯ {{ item.count }} 行相同已折叠 ⋯</td>
            </tr>
            <tr v-else :id="`diff-row-${item.rowIdx}`" :class="rowBg(item.row.type)">
              <td class="px-2 text-right select-none border-b border-base-content/5" :class="lineNoColor(item.row.left.no, item.row.type)">
                {{ item.row.left.no ?? '' }}
              </td>
              <td class="pl-3 pr-2 whitespace-pre-wrap break-all border-b border-base-content/5">
                <template v-if="item.row.left.no !== null">
                  <RenderTokens
                      v-if="inlineHighlight && (item.row.type === 'replace' || item.row.type === 'delete')"
                      :tokens="leftTokens(item.row)"
                      markClass="diff-mark-del"
                  />
                  <span v-else>{{ item.row.left.text }}</span>
                </template>
              </td>
              <td class="px-2 text-right select-none border-b border-base-content/5" :class="lineNoColor(item.row.right.no, item.row.type)">
                {{ item.row.right.no ?? '' }}
              </td>
              <td class="pl-3 pr-2 whitespace-pre-wrap break-all border-b border-base-content/5">
                <template v-if="item.row.right.no !== null">
                  <RenderTokens
                      v-if="inlineHighlight && (item.row.type === 'replace' || item.row.type === 'insert')"
                      :tokens="rightTokens(item.row)"
                      markClass="diff-mark-ins"
                  />
                  <span v-else>{{ item.row.right.text }}</span>
                </template>
              </td>
            </tr>
          </template>
          <tr v-if="!displayItems.length">
            <td colspan="4" class="text-center opacity-50 py-6 font-sans">两段文本内容完全一致 🎉</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Diff结果：统一视图 -->
    <div v-if="hasInput && !tooLarge && viewMode === 'unified'" class="card bg-base-200 shadow-sm overflow-hidden">
      <div class="overflow-auto max-h-[60vh] font-mono text-[13px] leading-6">
        <table class="table w-full border-separate border-spacing-0">
          <tbody>
          <template v-for="item in displayItems" :key="item.key">
            <tr v-if="item.kind === 'gap'" class="bg-base-300/60 text-center text-xs opacity-70">
              <td colspan="4" class="py-1 border-b border-base-content/5">⋯ {{ item.count }} 行相同已折叠 ⋯</td>
            </tr>
            <tr v-else :id="`diff-row-${item.rowIdx}`" :class="rowBg(item.row.type)">
              <td class="w-12 px-2 text-right select-none border-b border-base-content/5" :class="lineNoColor(item.row.left.no, item.row.type)">
                {{ item.row.left.no ?? '' }}
              </td>
              <td class="w-12 px-2 text-right select-none border-b border-base-content/5" :class="lineNoColor(item.row.right.no, item.row.type)">
                {{ item.row.right.no ?? '' }}
              </td>
              <td class="pl-2 pr-2 whitespace-pre-wrap break-all border-b border-base-content/5">
                <span class="select-none inline-block w-5 opacity-80">{{ signOf(item.row.type) }}</span>
                <template v-if="item.row.type === 'equal'">{{ item.row.left.text }}</template>
                <template v-else-if="item.row.type === 'insert'">
                  <RenderTokens v-if="inlineHighlight" :tokens="rightTokens(item.row)" markClass="diff-mark-ins"/>
                  <template v-else>{{ item.row.right.text }}</template>
                </template>
                <template v-else-if="item.row.type === 'delete'">
                  <RenderTokens v-if="inlineHighlight" :tokens="leftTokens(item.row)" markClass="diff-mark-del"/>
                  <template v-else>{{ item.row.left.text }}</template>
                </template>
                <template v-else>
                  <!-- replace：左右两行都展示 -->
                  <div>
                    <RenderTokens v-if="inlineHighlight" :tokens="leftTokens(item.row)" markClass="diff-mark-del"/>
                    <template v-else>{{ item.row.left.text }}</template>
                  </div>
                  <div>
                    <RenderTokens v-if="inlineHighlight" :tokens="rightTokens(item.row)" markClass="diff-mark-ins"/>
                    <template v-else>{{ item.row.right.text }}</template>
                  </div>
                </template>
              </td>
            </tr>
          </template>
          <tr v-if="!displayItems.length">
            <td colspan="4" class="text-center opacity-50 py-6 font-sans">两段文本内容完全一致 🎉</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 初始提示 -->
    <div v-if="!hasInput" class="text-center opacity-40 py-10 text-sm">
      在上方输入两段文本即可自动比较差异。结果表格中带行号列，“原始行/对比行”分别为各自文本中的实际行号。
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';
import RenderTokens from '@/components/RenderTokens';
import {
  diffLines,
  inlineTokens,
  type DiffStats,
  type InlineToken,
  type NormRow
} from '@/components/RenderTokens/diffUtils';

const leftText = ref<string>('');
const rightText = ref<string>('');
const viewMode = ref<'side' | 'unified'>('side');
const ignoreWs = ref<boolean>(false);
const ignoreCase = ref<boolean>(false);
const inlineHighlight = ref<boolean>(true);
const collapseEqual = ref<boolean>(false);

/** 行数上限保护 */
const MAX_LINES = 5000;
const hasInput = computed(() => leftText.value !== '' || rightText.value !== '');
const tooLarge = computed(() => {
  const lc = countLines(leftText.value);
  const rc = countLines(rightText.value);
  if (lc > MAX_LINES || rc > MAX_LINES) {
    return `文本过大（原始 ${lc} 行 / 对比 ${rc} 行，上限 ${MAX_LINES} 行），请减少内容后再比较。`;
  }
  return '';
});

const EMPTY_STATS: DiffStats = { added: 0, deleted: 0, modified: 0, unchanged: 0, totalRows: 0 };

const diffResult = computed<{ rows: NormRow[]; stats: DiffStats }>(() => {
  if (!hasInput.value || tooLarge.value) return { rows: [], stats: EMPTY_STATS };
  return diffLines(leftText.value, rightText.value, { ignoreWs: ignoreWs.value, ignoreCase: ignoreCase.value });
});
const rows = computed(() => diffResult.value.rows);
const stats = computed(() => diffResult.value.stats);

/** 内联高亮token缓存（WeakMap按行对象缓存，避免模板中重复计算；diff结果变化时自动重建） */
const leftTokenCache = new WeakMap<NormRow, InlineToken[]>();
const rightTokenCache = new WeakMap<NormRow, InlineToken[]>();

function leftTokens(row: NormRow): InlineToken[] {
  let tokens = leftTokenCache.get(row);
  if (!tokens) {
    tokens = inlineTokens(row.left.text, row.right.text);
    leftTokenCache.set(row, tokens);
  }
  return tokens;
}
function rightTokens(row: NormRow): InlineToken[] {
  let tokens = rightTokenCache.get(row);
  if (!tokens) {
    tokens = inlineTokens(row.right.text, row.left.text);
    rightTokenCache.set(row, tokens);
  }
  return tokens;
}

/** 差异块列表（用于快速跳转） */
const diffHunks = computed(() => {
  const out: Array<{ rowIdx: number; ln: number | null; rn: number | null }> = [];
  rows.value.forEach((r, i) => {
    if (r.type === 'equal') return;
    // 只记录每个连续差异段的首行
    if (i > 0 && rows.value[i - 1].type !== 'equal') return;
    out.push({ rowIdx: i, ln: r.left.no, rn: r.right.no });
  });
  return out;
});

/** 展示项：普通行 or 折叠间隙 */
type DisplayItem =
    | { kind: 'row'; key: string; rowIdx: number; row: NormRow }
    | { kind: 'gap'; key: string; count: number };

const displayItems = computed<DisplayItem[]>(() => {
  const rs = rows.value;
  if (!collapseEqual.value) {
    return rs.map((row, i) => ({ kind: 'row', key: `r${i}`, rowIdx: i, row }) as DisplayItem);
  }
  const CONTEXT = 3; // 差异上下保留3行上下文
  const keep = new Array<boolean>(rs.length).fill(false);
  rs.forEach((r, i) => {
    if (r.type !== 'equal') {
      for (let k = Math.max(0, i - CONTEXT); k <= Math.min(rs.length - 1, i + CONTEXT); k++) keep[k] = true;
    }
  });
  const out: DisplayItem[] = [];
  let gapCount = 0;
  let gapStart = -1;
  const flushGap = () => {
    if (gapCount > 0) out.push({ kind: 'gap', key: `g${gapStart}-${gapCount}`, count: gapCount });
    gapCount = 0;
  };
  rs.forEach((r, i) => {
    if (keep[i]) {
      flushGap();
      out.push({ kind: 'row', key: `r${i}`, rowIdx: i, row: r });
    } else {
      if (gapCount === 0) gapStart = i;
      gapCount++;
    }
  });
  flushGap();
  return out;
});

/** 行背景色（daisyUI语义色 + 透明度） */
function rowBg(type: NormRow['type']): string {
  switch (type) {
    case 'insert': return 'bg-success/15';
    case 'delete': return 'bg-error/15';
    case 'replace': return 'bg-info/10';
    default: return '';
  }
}
/** 行号颜色 */
function lineNoColor(no: number | null, type: NormRow['type']): string {
  if (no === null) return 'opacity-30';
  if (type === 'insert') return 'text-success/80';
  if (type === 'delete') return 'text-error/80';
  if (type === 'replace') return 'text-info/80';
  return 'opacity-50';
}
function signOf(type: NormRow['type']): string {
  return type === 'insert' ? '+' : type === 'delete' ? '-' : type === 'replace' ? '~' : ' ';
}

function scrollToRow(rowIdx: number) {
  nextTick(() => {
    const el = document.getElementById(`diff-row-${rowIdx}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

const swapSides = () => {
  const t = leftText.value;
  leftText.value = rightText.value;
  rightText.value = t;
};
const clearAll = () => {
  leftText.value = '';
  rightText.value = '';
};

function countLines(text: string): number {
  if (text === '') return 0;
  return text.replace(/\r\n?/g, '\n').split('\n').length;
}
</script>

<style scoped>
.diff-mark-del {
  background-color: color-mix(in oklab, var(--color-error) 30%, transparent);
  color: inherit;
}
.diff-mark-ins {
  background-color: color-mix(in oklab, var(--color-success) 35%, transparent);
  color: inherit;
}
</style>
