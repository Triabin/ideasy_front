<!-- JSON格式化路由组件 -->
<template>
  <div class="h-full max-h-full w-full flex flex-col gap-4 p-4 overflow-y-auto thin-scrollbar">
    <h1 class="w-full text-center text-3xl mt-2">JSON 格式化</h1>
    <p class="text-sm opacity-70 text-center">粘贴 JSON 文本，一键格式化 / 压缩 / 校验；支持注释、单引号、尾随逗号等宽松语法，并提供树形浏览与错误定位。</p>

    <!-- 工具栏 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body py-3 gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <label class="join items-center mr-1">
            <span class="join-item btn btn-sm btn-ghost pointer-events-none normal-case">缩进</span>
            <select v-model="indentChar" class="select select-sm join-item w-24">
              <option value="space">空格</option>
              <option value="tab">Tab</option>
            </select>
          </label>
          <label class="join items-center mr-1">
            <span class="join-item btn btn-sm btn-ghost pointer-events-none normal-case">尺寸</span>
            <input
                v-if="indentChar === 'space'"
                type="number" min="1" max="12" step="1"
                v-model.number="indentSize"
                class="input input-sm join-item w-16 font-mono text-center"
            />
            <select v-else v-model.number="indentSize" class="select select-sm join-item w-20">
              <option :value="2">2</option>
              <option :value="4">4</option>
              <option :value="8">8</option>
            </select>
          </label>
          <label class="join items-center mr-1">
            <span class="join-item btn btn-sm btn-ghost pointer-events-none normal-case">排序</span>
            <select v-model="sortType" class="select select-sm join-item w-28">
              <option value="none">不排序</option>
              <option value="asc">按键升序</option>
              <option value="desc">按键降序</option>
            </select>
          </label>
          <div class="divider divider-horizontal mx-1"></div>
          <button class="btn btn-sm btn-primary" @click="() => doFormat()">格式化</button>
          <button class="btn btn-sm" @click="doMinify">压缩</button>
          <button class="btn btn-sm" @click="doValidate">校验</button>
          <button class="btn btn-sm" @click="inputText = outputText || inputText; doFormat()" :disabled="!outputText && !inputText">结果回填输入</button>
          <div class="divider divider-horizontal mx-1"></div>
          <label class="label cursor-pointer gap-1 text-sm">
            <input type="checkbox" class="toggle toggle-sm" v-model="autoFormat"/>
            <span>实时解析</span>
          </label>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <label class="input input-sm join-item items-center gap-2 w-56">
              <span class="opacity-60 shrink-0 text-xs">路径</span>
              <input type="text" class="grow font-mono text-xs" v-model="queryPath" placeholder="$.users.0.name" @keyup.enter="doQuery"/>
            </label>
            <button class="btn btn-sm" @click="doQuery">查询</button>
            <button class="btn btn-sm btn-ghost" title="上传 .json / .txt 文件" @click="fileRef?.click()">打开文件</button>
            <input ref="fileRef" type="file" accept=".json,.txt,.log,application/json,text/plain" class="hidden" @change="onFileChange"/>
            <button class="btn btn-sm btn-ghost" title="从剪贴板粘贴" @click="pasteFromClipboard">粘贴</button>
            <button class="btn btn-sm btn-ghost" title="清空" @click="clearAll">清空</button>
          </div>
        </div>
        <UnderLineMsg ref="msgRef"/>
      </div>
    </div>

    <!-- 编辑区 / 输出区 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 grow min-h-[24rem]">
      <!-- 输入 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body p-3 gap-2">
          <div class="flex items-center justify-between">
            <h2 class="card-title text-base">输入</h2>
            <span class="text-xs opacity-60 font-mono">{{ inputStats.chars }} 字符 · {{ inputStats.lines }} 行 · {{ formatBytes(inputStats.bytes) }}</span>
          </div>
          <textarea
              v-model="inputText"
              class="textarea textarea-bordered w-full grow min-h-72 font-mono text-sm leading-relaxed resize-none thin-scrollbar"
              :class="{ 'textarea-error': !!parseError }"
              placeholder='在此粘贴或输入 JSON，例如：&#10;{ "name": "Ideasy", "tools": ["ColorCvter", "JsonFormatter"] }'
              spellcheck="false"
          ></textarea>
          <!-- 错误定位 -->
          <div v-if="parseError" class="rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 flex flex-col gap-1">
            <i class="text-xs text-red-500 font-mono">{{ parseError.message }}（第 {{ parseError.line }} 行 第 {{ parseError.column }} 列）</i>
            <pre v-if="errorSnippet" class="text-xs font-mono whitespace-pre-wrap opacity-90 rounded p-1 bg-base-300/60">{{ errorSnippet }}</pre>
          </div>
        </div>
      </div>
      <!-- 输出 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body p-3 gap-2">
          <div class="flex items-center justify-between">
            <h2 class="card-title text-base">
              输出
              <span v-if="parsed !== undefined && !parseError" class="badge badge-success badge-sm gap-1">
                  <Copied :size="14" :twClasses="['fill-success']"/>合法
                </span>
            </h2>
            <div class="flex items-center gap-2">
              <div class="join">
                <button class="btn btn-xs join-item" :class="{ 'btn-active': viewMode === 'text' }" @click="viewMode = 'text'">文本</button>
                <button class="btn btn-xs join-item" :class="{ 'btn-active': viewMode === 'tree' }" @click="viewMode = 'tree'" :disabled="parseError !== null">树形</button>
              </div>
              <button v-show="viewMode === 'tree'" class="btn btn-xs btn-ghost" @click="toggleCollapseAll">{{ allCollapsed ? '全部展开' : '全部收起' }}</button>
              <button class="btn btn-sm btn-ghost" title="复制结果" @click="copy(outputText)" :disabled="!outputText || viewMode === 'tree'">
                <Copied v-if="copiedText === outputText && copiedText" :size="16" :twClasses="['fill-success']"/>
                <Copy v-else :size="16"/>
              </button>
              <button class="btn btn-sm btn-ghost" title="下载为 .json 文件" @click="downloadOutput" :disabled="!outputText">下载</button>
            </div>
          </div>

          <!-- 文本视图 -->
          <pre
              v-show="viewMode === 'text'"
              class="w-full grow min-h-72 max-h-[32rem] overflow-auto thin-scrollbar font-mono text-sm leading-relaxed rounded-lg bg-base-300/50 p-3 whitespace-pre"
          ><template v-for="(line, li) in highlightedLines" :key="li"><span v-html="line"></span>
</template></pre>

          <!-- 树形视图 -->
          <div v-show="viewMode === 'tree'" class="w-full grow min-h-72 max-h-[32rem] overflow-auto thin-scrollbar font-mono text-sm rounded-lg bg-base-300/50 p-2">
            <div
                v-for="node in treeNodes"
                :key="node.path"
                class="tree-row flex items-start gap-1 rounded hover:bg-base-300/70 pr-2"
                :style="{ paddingLeft: node.depth * tabWidth + 'px' }"
                :class="{ 'bg-yellow-500/20 ring-1 ring-yellow-500/50': queryHitPath && node.path === queryHitPath }"
            >
              <button
                  v-if="node.isObject || node.isArray"
                  class="shrink-0 w-4 h-5 leading-5 text-center cursor-pointer opacity-70 hover:opacity-100 select-none"
                  @click="toggleCollapse(node.path)"
              >{{ collapsed.has(node.path) ? '▸' : '▾' }}</button>
              <span v-else class="shrink-0 w-4"></span>
              <span v-if="node.key !== ''" class="shrink-0">
                <span class="j-key" :title="node.path">{{ node.key }}</span><span class="opacity-50">:&nbsp;</span>
              </span>
              <template v-if="collapsed.has(node.path)">
                <span class="opacity-60 cursor-pointer" @click="toggleCollapse(node.path)">
                  {{ node.isArray ? `[ ${node.childCount} ]` : `{ ${node.childCount} }` }}
                </span>
              </template>
              <template v-else-if="node.isObject || node.isArray">
                <span class="opacity-60">{{ node.isArray ? '[' : '{' }}</span>
              </template>
              <template v-else>
                <span :class="valueClass(node.value)">{{ displayValue(node.value) }}</span>
              </template>
              <button
                  class="shrink-0 opacity-0 group-hover:opacity-100 ml-auto self-center"
                  style="opacity:.35"
                  title="复制该节点值"
                  @click="copyNode(node)"
              ><Copy :size="13"/></button>
            </div>
            <div v-if="!treeNodes.length" class="opacity-50 p-3">暂无可展示的 JSON 数据</div>
          </div>

          <!-- 统计信息 -->
          <div v-if="stats" class="flex flex-wrap gap-1.5 text-xs">
            <span class="badge badge-outline badge-sm">节点 {{ stats.nodes }}</span>
            <span class="badge badge-outline badge-sm">对象 {{ stats.objects }}</span>
            <span class="badge badge-outline badge-sm">数组 {{ stats.arrays }}</span>
            <span class="badge badge-outline badge-sm">键 {{ stats.keys }}</span>
            <span class="badge badge-outline badge-sm">字符串 {{ stats.strings }}</span>
            <span class="badge badge-outline badge-sm">数字 {{ stats.numbers }}</span>
            <span class="badge badge-outline badge-sm">布尔 {{ stats.booleans }}</span>
            <span class="badge badge-outline badge-sm">null {{ stats.nulls }}</span>
            <span class="badge badge-outline badge-sm">深度 {{ stats.maxDepth }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import UnderLineMsg from '@/components/UnderLineMsg';
import {
  parseJsonLoose, stringifyJson, analyzeJson, flattenTree, getJsonValue,
  collectContainerPaths, JsonParseError,
  type JsonValue, type SortType, type JsonTreeNode, type JsonStats, type IndentChar,
} from './jsonUtils';

const msgRef = ref<any>();
const fileRef = ref<HTMLInputElement>();

/* ------------------------- 状态 ------------------------- */

const inputText = ref<string>('');
const outputText = ref<string>('');
const parsed = ref<JsonValue | undefined>(undefined);
const parseError = ref<JsonParseError | null>(null);
const indentChar = ref<IndentChar>('space');
const indentSize = ref<number>(2);
const sortType = ref<SortType>('none');
const autoFormat = ref<boolean>(true);
const viewMode = ref<'text' | 'tree'>('text');
const copiedText = ref<string>('');
const collapsed = ref<Set<string>>(new Set());
const queryPath = ref<string>('');
const queryHitPath = ref<string>('');

/* ------------------------- 派生数据 ------------------------- */

/** 输入文本基础统计 */
const inputStats = computed(() => {
  const t = inputText.value;
  return {
    chars: t.length,
    lines: t ? t.split('\n').length : 0,
    bytes: new TextEncoder().encode(t).length,
  };
});

/** 结构统计（解析成功时） */
const stats = computed<JsonStats | null>(() => parsed.value === undefined ? null : analyzeJson(parsed.value));

/** 树节点列表 */
const treeNodes = computed<JsonTreeNode[]>(() =>
    parsed.value === undefined ? [] : flattenTree(parsed.value, collapsed.value)
);

/** 错误代码片段（出错行 ± 上下文） */
const errorSnippet = computed(() => {
  if (!parseError.value) return '';
  const lines = inputText.value.split('\n');
  const idx = parseError.value.line - 1;
  const from = Math.max(0, idx - 1);
  const to = Math.min(lines.length - 1, idx + 1);
  const seg: string[] = [];
  for (let i = from; i <= to; i++) {
    const mark = i === idx ? '> ' : '  ';
    seg.push(`${mark}${lines[i].slice(0, 120)}`);
    if (i === idx) {
      seg.push(`  ${' '.repeat(Math.min(parseError.value.column - 1, 118))}^`);
    }
  }
  return seg.join('\n');
});

/** 语法高亮后的输出行（HTML 字符串） */
const highlightedLines = computed<string[]>(() => {
  if (!outputText.value) return [''];
  return outputText.value.split('\n').map(escapeAndHighlight);
});

/* ------------------------- 核心逻辑 ------------------------- */

/** 解析输入文本 */
const doParse = (): boolean => {
  const text = inputText.value.trim();
  if (!text) {
    parsed.value = undefined;
    parseError.value = null;
    outputText.value = '';
    collapsed.value = new Set();
    return false;
  }
  try {
    const value = parseJsonLoose(text);
    parsed.value = value;
    parseError.value = null;
    return true;
  } catch (e: any) {
    parsed.value = undefined;
    parseError.value = e instanceof JsonParseError ? e : null;
    if (!(e instanceof JsonParseError)) msgRef.value?.showMsg(e?.message ?? '解析失败', 'fail', 2500);
    return false;
  }
};

/** 生成输出并同步折叠状态 */
const renderOutput = () => {
  if (parsed.value === undefined) {
    outputText.value = '';
    return;
  }
  outputText.value = stringifyJson(parsed.value, formatOpts());
  // 折叠集合中已不存在的路径自动剔除
  const valid = new Set(collectContainerPaths(parsed.value));
  const next = new Set([...collapsed.value].filter(p => valid.has(p)));
  collapsed.value = next;
};

/** 当前格式化选项 */
const formatOpts = () => ({ indentChar: indentChar.value, indentSize: indentSize.value, sortType: sortType.value });

/** 格式化 */
const doFormat = () => {
  if (!doParse()) {
    if (inputText.value.trim()) msgRef.value?.showMsg(parseError.value?.message ?? '解析失败', 'fail', 3000);
    renderOutput();
    return;
  }
  renderOutput();
  msgRef.value?.showMsg('格式化成功', 'success', 1500);
};

/** 压缩为一行 */
const doMinify = () => {
  if (!doParse()) {
    if (inputText.value.trim()) msgRef.value?.showMsg(parseError.value?.message ?? '解析失败', 'fail', 3000);
    return;
  }
  outputText.value = stringifyJson(parsed.value!, { ...formatOpts(), indentSize: 0 });
  msgRef.value?.showMsg(`压缩完成，共 ${outputText.value.length} 字符`, 'success', 1500);
};

/** 仅校验 */
const doValidate = () => {
  if (!inputText.value.trim()) {
    msgRef.value?.showMsg('请先输入内容', 'warning', 1500);
    return;
  }
  if (doParse()) {
    renderOutput();
    msgRef.value?.showMsg('✓ JSON 合法', 'success', 2000);
  } else {
    msgRef.value?.showMsg(
        `✗ ${parseError.value?.message ?? '不合法'}（第 ${parseError.value?.line ?? '?'} 行 第 ${parseError.value?.column ?? '?'} 列）`,
        'fail', 4000
    );
  }
};

/** 路径查询 */
const doQuery = () => {
  queryHitPath.value = '';
  if (parsed.value === undefined) {
    msgRef.value?.showMsg('请先成功解析 JSON', 'warning', 1500);
    return;
  }
  const path = queryPath.value.trim();
  if (!path) return;
  const hit = getJsonValue(parsed.value, path);
  if (hit === undefined) {
    msgRef.value?.showMsg(`路径 ${path} 不存在`, 'fail', 2500);
    return;
  }
  // 展开命中路径的所有父级
  const parts = path.split('.');
  const next = new Set(collapsed.value);
  for (let i = 1; i < parts.length; i++) {
    next.delete(parts.slice(0, i).join('.'));
  }
  collapsed.value = next;
  queryHitPath.value = path;
  viewMode.value = 'tree';
  msgRef.value?.showMsg(`已定位 ${path}`, 'success', 2000);
};

/** 折叠/展开节点 */
const toggleCollapse = (path: string) => {
  const next = new Set(collapsed.value);
  if (next.has(path)) next.delete(path); else next.add(path);
  collapsed.value = next;
};

/** 是否已全部收起（所有容器节点均处于折叠状态） */
const allCollapsed = computed(() => {
  if (parsed.value === undefined) return false;
  const containers = collectContainerPaths(parsed.value);
  if (!containers.length) return false;
  return containers.every(p => p === '$' || collapsed.value.has(p));
});

/** 全部收起 / 全部展开 */
const toggleCollapseAll = () => {
  if (parsed.value === undefined) return;
  const containers = collectContainerPaths(parsed.value).filter(p => p !== '$');
  collapsed.value = allCollapsed.value ? new Set() : new Set(containers);
};

/** 超长 JSON 保护：节点过多时默认收起深层容器，避免卡顿 */
watch([viewMode, parsed], () => {
  if (viewMode.value === 'tree' && parsed.value !== undefined && collapsed.value.size === 0) {
    const deep = collectContainerPaths(parsed.value).filter(p => p.split('.').length > 3);
    if (deep.length > 50) collapsed.value = new Set(deep);
  }
});

/** 复制树节点值 */
const copyNode = (node: JsonTreeNode) => copy(stringifyJson(node.value, formatOpts()));

/* ------------------------- 交互辅助 ------------------------- */

/** 清空 */
const clearAll = () => {
  inputText.value = '';
  outputText.value = '';
  parsed.value = undefined;
  parseError.value = null;
  collapsed.value = new Set();
  queryHitPath.value = '';
};

/** 打开本地文件 */
const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    inputText.value = String(reader.result ?? '');
    doFormat();
    msgRef.value?.showMsg(`已载入文件 ${file.name}`, 'success', 2000);
  };
  reader.onerror = () => msgRef.value?.showMsg('文件读取失败', 'fail', 2500);
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = '';
};

/** 从剪贴板粘贴 */
const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      msgRef.value?.showMsg('剪贴板为空', 'warning', 1500);
      return;
    }
    inputText.value = text;
    doFormat();
  } catch {
    msgRef.value?.showMsg('无法访问剪贴板，请手动粘贴（Ctrl+V）', 'warning', 2500);
  }
};

/** 下载输出 */
const downloadOutput = () => {
  if (!outputText.value) return;
  const blob = new Blob([outputText.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'formatted.json';
  a.click();
  URL.revokeObjectURL(url);
};

/** 复制到剪贴板 */
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  copiedText.value = text;
  msgRef.value?.showMsg('已复制到剪贴板', 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
};

/** 字节数友好显示 */
const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

/* ------------------------- 语法高亮 ------------------------- */

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 对单行 JSON 文本做简单着色 */
const escapeAndHighlight = (line: string): string => {
  const esc = escapeHtml(line);
  return esc.replace(
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
      (m: string, str?: string, colon?: string, bool?: string) => {
        if (str !== undefined) {
          return colon !== undefined
              ? `<span class="j-key">${str}</span>${colon}`
              : `<span class="j-str">${str}</span>`;
        }
        if (bool !== undefined) return `<span class="j-bool">${bool}</span>`;
        if (m === 'null') return `<span class="j-null">null</span>`;
        return `<span class="j-num">${m}</span>`;
      }
  );
};

/** 树视图中值的样式类 */
const valueClass = (v: JsonValue) => {
  if (v === null) return 'j-null';
  if (typeof v === 'string') return 'j-str';
  if (typeof v === 'number') return 'j-num';
  if (typeof v === 'boolean') return 'j-bool';
  return '';
};

/** 树视图中值的显示文本 */
const displayValue = (v: JsonValue): string => {
  if (v === null) return 'null';
  if (typeof v === 'string') return `"${v}"`;
  return String(v);
};

/* ------------------------- 侦听 ------------------------- */

// 实时解析
watch(inputText, () => {
  if (!autoFormat.value) return;
  if (doParse()) renderOutput();
  else outputText.value = '';
});
// 缩进尺寸合法性保护（1~12）
watch(indentSize, (v) => {
  if (!Number.isFinite(v)) indentSize.value = 2;
  else indentSize.value = Math.min(12, Math.max(1, Math.round(v)));
});
// 选项变化即时重渲染
watch([indentChar, indentSize, sortType], () => {
  if (parsed.value !== undefined) renderOutput();
});

/* ------------------------- 树形视图缩进宽度 ------------------------- */

/** Tab 尺寸换算为像素对齐宽度 */
const tabWidth = computed(() => indentChar.value === 'tab' ? indentSize.value * 4 : indentSize.value * 8);
</script>

<style scoped>
/* 语法着色 */
.j-key { color: var(--color-primary, #7c3aed); font-weight: 600; }
.j-str { color: #16a34a; }
.j-num { color: #d97706; }
.j-bool { color: #db2777; }
.j-null { color: #64748b; font-style: italic; }

/* 树行悬停时显示复制按钮 */
.tree-row:hover button { opacity: 1 !important; }

:deep(pre span) { white-space: pre; }
</style>
