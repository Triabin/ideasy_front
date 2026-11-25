<!-- 在线计算器路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">在线计算器</h1>
    <p class="text-sm opacity-70 text-center">
      支持标准四则运算与科学计算，输入表达式时实时预览结果，支持键盘操作，历史记录自动保存在本地（localStorage）。
    </p>

    <div class="w-full flex flex-col xl:flex-row items-center xl:items-start justify-center gap-4">
      <!-- 计算器主体 -->
      <div class="card bg-base-200 shadow-sm w-full max-w-md shrink-0">
        <div class="card-body gap-3">
          <!-- 模式切换与角度单位 -->
          <div class="flex flex-wrap items-center gap-2">
            <div class="join">
              <button class="btn btn-sm join-item" :class="{ 'btn-primary': mode === 'standard' }" @click="mode = 'standard'">标准</button>
              <button class="btn btn-sm join-item" :class="{ 'btn-primary': mode === 'scientific' }" @click="mode = 'scientific'">科学</button>
            </div>
            <button
                v-if="mode === 'scientific'"
                class="btn btn-sm btn-ghost border border-base-300 ml-auto font-mono"
                title="切换角度单位：DEG（角度）/ RAD（弧度），影响三角函数与反三角函数"
                @click="angleUnit = angleUnit === 'DEG' ? 'RAD' : 'DEG'"
            >{{ angleUnit === 'DEG' ? '角度 DEG' : '弧度 RAD' }}</button>
          </div>

          <!-- 显示屏 -->
          <div class="rounded-2xl bg-base-100 border border-base-300 px-4 py-3 flex flex-col items-end gap-0.5 min-h-28" :class="{ 'border-error': error }">
            <div class="w-full flex items-center gap-2 text-xs opacity-50">
              <span class="font-mono shrink-0">{{ error ? '错误' : justEvaluated ? '结果' : '表达式' }}</span>
              <span v-if="mode === 'scientific'" class="badge badge-xs badge-ghost font-mono">{{ angleUnit }}</span>
              <button
                  v-if="expr"
                  class="btn btn-xs btn-ghost ml-auto h-6 min-h-6 px-1.5 gap-1 shrink-0"
                  :title="justEvaluated ? '复制结果' : '复制表达式'"
                  @click="copy(prettify(expr))"
              >
                <Copied v-if="copiedText === prettify(expr)" :size="14" :twClasses="['fill-success']"/>
                <Copy v-else :size="14"/>
              </button>
            </div>
            <div class="w-full text-right font-mono text-2xl leading-9 break-all select-all" :class="{ 'text-error': error }">{{ expr ? prettify(expr) : '0' }}</div>
            <div class="w-full text-right min-h-6">
              <span v-if="error" class="text-error text-xs break-all">{{ error }}</span>
              <span v-else-if="preview" class="font-mono text-sm opacity-60 break-all">= {{ preview }}</span>
            </div>
          </div>

          <!-- 科学函数键盘（mousedown.prevent 避免按钮获得焦点后 Enter 双重触发） -->
          <div v-if="mode === 'scientific'" class="grid grid-cols-4 gap-1.5 select-none" @mousedown.prevent>
            <button
                v-for="b in sciButtons"
                :key="b.label"
                :class="b.active
                  ? 'btn btn-sm btn-primary font-mono'
                  : 'btn btn-sm bg-base-100 border-base-300 hover:bg-base-300 font-mono'"
                :title="b.title"
                @click="b.onClick"
            >{{ b.label }}</button>
          </div>

          <!-- 数字键盘 -->
          <div class="grid grid-cols-4 gap-1.5 select-none" @mousedown.prevent>
            <button :class="CLS_CLR" title="清空（Esc）" @click="clear">C</button>
            <button :class="CLS_FN" title="退格（Backspace）" @click="back">⌫</button>
            <button :class="CLS_OP" title="百分号：50% = 0.5" @click="append('%')">%</button>
            <button :class="CLS_OP" title="除号（/）" @click="append('÷')">÷</button>

            <button :class="CLS_NUM" @click="append('7')">7</button>
            <button :class="CLS_NUM" @click="append('8')">8</button>
            <button :class="CLS_NUM" @click="append('9')">9</button>
            <button :class="CLS_OP" title="乘号（*）" @click="append('×')">×</button>

            <button :class="CLS_NUM" @click="append('4')">4</button>
            <button :class="CLS_NUM" @click="append('5')">5</button>
            <button :class="CLS_NUM" @click="append('6')">6</button>
            <button :class="CLS_OP" title="减号（-）" @click="append('-')">−</button>

            <button :class="CLS_NUM" @click="append('1')">1</button>
            <button :class="CLS_NUM" @click="append('2')">2</button>
            <button :class="CLS_NUM" @click="append('3')">3</button>
            <button :class="CLS_OP" title="加号（+）" @click="append('+')">+</button>

            <button :class="CLS_FN" title="正负号切换" @click="sign">±</button>
            <button :class="CLS_NUM" @click="append('0')">0</button>
            <button :class="CLS_NUM" title="小数点（.）" @click="dot">.</button>
            <button :class="CLS_EQ" title="计算（Enter）" @click="equals">=</button>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="card bg-base-200 shadow-sm w-full max-w-md shrink-0">
        <div class="card-body gap-2">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="card-title text-base">历史记录（最多 {{ MAX_RECORDS }} 条）</h2>
            <span class="badge badge-outline font-mono">{{ records.length }}</span>
            <button
                class="btn btn-sm btn-error/80 ml-auto shrink-0"
                :disabled="!records.length"
                @click="clearHistory"
            >清除记录</button>
          </div>
          <div v-if="!records.length" class="py-6 text-center opacity-50 text-sm">
            暂无历史记录。按 = 计算后，表达式与结果会自动保存到本地（localStorage）。
          </div>
          <div v-else class="flex flex-col gap-1.5 overflow-y-auto max-h-128 pr-1">
            <div
                v-for="(rec, idx) in records"
                :key="rec.time + '-' + idx"
                class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex flex-col gap-0.5"
            >
              <div class="flex items-center gap-2 text-xs opacity-60">
                <span class="font-mono">{{ formatTime(rec.time) }}</span>
                <div class="ml-auto flex items-center gap-1">
                  <button class="btn btn-xs btn-ghost" title="载入该表达式" @click="loadRecord(rec)">↩</button>
                  <button class="btn btn-xs btn-ghost" title="复制结果" @click="copy(rec.result)">
                    <Copied v-if="copiedText === rec.result" :size="14" :twClasses="['fill-success']"/>
                    <Copy v-else :size="14"/>
                  </button>
                  <button class="btn btn-xs btn-ghost text-error" title="删除该记录" @click="appDataStore.removeCalculatorRecord(idx)">✕</button>
                </div>
              </div>
              <div
                  class="font-mono text-xs opacity-70 break-all cursor-pointer hover:text-primary transition-colors"
                  title="点击载入表达式"
                  @click="loadRecord(rec)"
              >{{ rec.expr }}</div>
              <div
                  class="font-mono text-base break-all cursor-pointer select-all hover:text-primary transition-colors"
                  title="点击复制结果"
                  @click="copy(rec.result)"
              >= {{ rec.result }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用说明 -->
    <details class="collapse collapse-arrow bg-base-100 border border-base-300 w-full max-w-md xl:max-w-228 mx-auto">
      <summary class="collapse-title font-semibold">使用说明与键盘快捷键</summary>
      <div class="collapse-content text-sm text-base-content/75 leading-6">
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div>
            <h3 class="font-semibold mb-1">使用说明</h3>
            <ul class="list-disc pl-5 flex flex-col gap-1">
              <li>表达式合法时，显示屏下方会实时预览计算结果。</li>
              <li>% 为后置百分号：50% = 0.5；n! 为阶乘，仅支持非负整数（最大 170!）。</li>
              <li>科学模式下三角函数与反三角函数受 DEG（角度）/ RAD（弧度）设置影响。</li>
              <li>按 = 计算时，未闭合的括号会自动补全。</li>
              <li>结果绝对值 ≥ 10<sup>16</sup> 或 &lt; 10<sup>-12</sup> 时以科学计数法显示。</li>
              <li>所有计算均在浏览器本地完成，不经过任何服务器。</li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold mb-1">键盘快捷键</h3>
            <ul class="list-disc pl-5 flex flex-col gap-1 font-mono text-xs leading-5">
              <li>0-9 . + - * / ^ ( ) % ! ：输入对应字符</li>
              <li>Enter 或 = ：计算</li>
              <li>Backspace ：退格；Esc ：清空</li>
              <li>p ：π；e ：自然常数</li>
              <li>科学模式：s / c / t ：sin / cos / tan；l ：ln；g ：log；r ：√</li>
            </ul>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>
<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { copyText, popupToast } from '@/common/utils.ts';
import useAppDataStore, { type CalculatorRecord } from '@/stores/appData';
import {
  appendDot, autoClose, backspace, evaluate, formatNumber,
  prettify, toggleSign, type AngleUnit
} from './calculator.ts';

/** 历史记录最大保存条数 */
const MAX_RECORDS = 100;

/** 数字键样式 */
const CLS_NUM = 'btn bg-base-100 border-base-300 hover:bg-base-300 text-lg font-medium';
/** 运算符键样式 */
const CLS_OP = 'btn bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-lg font-medium';
/** 功能键样式 */
const CLS_FN = 'btn bg-base-100 border-base-300 hover:bg-base-300 text-lg';
/** 清空键样式 */
const CLS_CLR = 'btn bg-error/10 text-error border-error/20 hover:bg-error/20 text-lg font-medium';
/** 等号键样式 */
const CLS_EQ = 'btn btn-primary text-lg font-medium';

const appDataStore = useAppDataStore();

/** 计算器模式：标准 / 科学 */
const mode = ref<'standard' | 'scientific'>('standard');
/** 角度单位（影响科学模式三角函数） */
const angleUnit = ref<AngleUnit>('DEG');
/** 2nd 第二功能层是否激活 */
const second = ref(false);
/** 当前表达式 */
const expr = ref('');
/** 是否刚完成一次 = 计算 */
const justEvaluated = ref(false);
/** 错误提示 */
const error = ref('');
/** 复制反馈的文本 */
const copiedText = ref('');

/** 历史记录 */
const records = computed(() => appDataStore.calculatorRecords);

/** 实时预览结果（表达式非法或不适合预览时为空） */
const preview = computed(() => {
  if (!expr.value || justEvaluated.value) return '';
  try {
    const output = formatNumber(evaluate(autoClose(expr.value), angleUnit.value));
    return output === expr.value ? '' : output;
  } catch {
    return '';
  }
});

/** 科学函数键盘按钮 */
interface SciButton {
  label: string;
  active?: boolean;
  title?: string;
  onClick: () => void;
}

/** 科学函数键盘（标签与行为随 2nd 层变化） */
const sciButtons = computed<SciButton[]>(() => {
  const inv = second.value;
  return [
    { label: '2nd', active: inv, title: '切换第二功能', onClick: () => (second.value = !second.value) },
    { label: inv ? 'x³' : 'x²', title: inv ? '立方' : '平方', onClick: () => useSecond(() => append(inv ? '^3' : '^2')) },
    { label: 'xʸ', title: '幂运算（^）', onClick: () => append('^') },
    { label: inv ? '∛' : '√', title: inv ? '立方根' : '平方根', onClick: () => useSecond(() => append(inv ? 'cbrt(' : '√(')) },
    { label: inv ? 'sin⁻¹' : 'sin', title: inv ? '反正弦' : '正弦', onClick: () => useSecond(() => append(inv ? 'asin(' : 'sin(')) },
    { label: inv ? 'cos⁻¹' : 'cos', title: inv ? '反余弦' : '余弦', onClick: () => useSecond(() => append(inv ? 'acos(' : 'cos(')) },
    { label: inv ? 'tan⁻¹' : 'tan', title: inv ? '反正切' : '正切', onClick: () => useSecond(() => append(inv ? 'atan(' : 'tan(')) },
    { label: 'n!', title: '阶乘（非负整数）', onClick: () => append('!') },
    { label: inv ? 'eˣ' : 'ln', title: inv ? 'e 的 x 次方' : '自然对数', onClick: () => useSecond(() => append(inv ? 'e^' : 'ln(')) },
    { label: inv ? '10ˣ' : 'log', title: inv ? '10 的 x 次方' : '常用对数（以 10 为底）', onClick: () => useSecond(() => append(inv ? '10^' : 'log(')) },
    { label: '1/x', title: '倒数', onClick: reciprocal },
    { label: '|x|', title: '绝对值', onClick: () => append('abs(') },
    { label: '(', title: '左括号', onClick: () => append('(') },
    { label: ')', title: '右括号', onClick: () => append(')') },
    { label: 'π', title: '圆周率', onClick: () => append('π') },
    { label: 'e', title: '自然常数', onClick: () => append('e') }
  ];
});

/**
 * 向表达式追加文本；刚完成计算时，运算符基于结果继续，其余开启新表达式
 * @param text {string} 追加的文本
 */
function append(text: string) {
  error.value = '';
  if (justEvaluated.value) {
    expr.value = /^[+\-×÷^%!)]/.test(text) ? expr.value + text : text;
    justEvaluated.value = false;
    return;
  }
  expr.value += text;
}

/**
 * 执行动作并退出 2nd 第二功能层
 * @param action {() => void} 要执行的动作
 */
function useSecond(action: () => void) {
  action();
  second.value = false;
}

/** 输入小数点（自动补前导 0） */
function dot() {
  error.value = '';
  if (justEvaluated.value) {
    expr.value = '0.';
    justEvaluated.value = false;
    return;
  }
  expr.value = appendDot(expr.value);
}

/** 切换末尾数字的正负号 */
function sign() {
  error.value = '';
  expr.value = toggleSign(expr.value);
}

/** 取倒数（1/x） */
function reciprocal() {
  if (!expr.value) return;
  error.value = '';
  expr.value = `1/(${autoClose(expr.value)})`;
  justEvaluated.value = false;
}

/** 退格：删除末尾一个词法单元（结果状态下清空） */
function back() {
  error.value = '';
  if (justEvaluated.value) {
    clear();
    return;
  }
  expr.value = backspace(expr.value);
}

/** 清空表达式 */
function clear() {
  expr.value = '';
  error.value = '';
  justEvaluated.value = false;
}

/** 执行计算（=） */
function equals() {
  if (!expr.value) return;
  const full = autoClose(expr.value);
  try {
    const output = formatNumber(evaluate(full, angleUnit.value));
    expr.value = output;
    justEvaluated.value = true;
    error.value = '';
    appDataStore.pushCalculatorRecord({ expr: prettify(full), result: output });
  } catch (e) {
    error.value = e instanceof Error ? e.message : '计算出错';
  }
}

/**
 * 载入历史记录到表达式
 * @param rec {CalculatorRecord} 历史记录
 */
function loadRecord(rec: CalculatorRecord) {
  expr.value = rec.expr;
  justEvaluated.value = false;
  error.value = '';
}

/** 清空历史记录 */
function clearHistory() {
  appDataStore.clearCalculatorHistory();
  popupToast('历史记录已清除', { type: 'success', duration: 1500, vertical: 'bottom' });
}

/**
 * 格式化时间戳
 * @param t {number} 时间戳（毫秒）
 */
function formatTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 复制图标定时切换事件 */
let copyTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * 复制文本并显示反馈图标
 * @param text {string} 要复制的文本
 */
async function copy(text: string) {
  await copyText(text);
  copiedText.value = text;
  popupToast('已复制到剪贴板', { type: 'success', duration: 1500, vertical: 'bottom' });
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
}

/** 处理全局键盘事件 */
function onKeydown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
  const key = e.key;
  // 按钮聚焦时的 Enter 交给浏览器点击行为处理，避免双重触发
  if (key === 'Enter' && document.activeElement instanceof HTMLButtonElement) return;
  if (/^[0-9]$/.test(key)) {
    append(key);
    return;
  }
  // 科学模式下的函数快捷键
  if (mode.value === 'scientific') {
    const inv = second.value;
    switch (key) {
      case 's': useSecond(() => append(inv ? 'asin(' : 'sin(')); return;
      case 'c': useSecond(() => append(inv ? 'acos(' : 'cos(')); return;
      case 't': useSecond(() => append(inv ? 'atan(' : 'tan(')); return;
      case 'l': useSecond(() => append(inv ? 'e^' : 'ln(')); return;
      case 'g': useSecond(() => append(inv ? '10^' : 'log(')); return;
      case 'r': useSecond(() => append(inv ? 'cbrt(' : '√(')); return;
    }
  }
  switch (key) {
    case '.': dot(); break;
    case '+': append('+'); break;
    case '-': append('-'); break;
    case '*': append('×'); break;
    case '/': e.preventDefault(); append('÷'); break;
    case '^': append('^'); break;
    case '(': append('('); break;
    case ')': append(')'); break;
    case '%': append('%'); break;
    case '!': append('!'); break;
    case 'p': append('π'); break;
    case 'e': append('e'); break;
    case 'Enter': case '=': e.preventDefault(); equals(); break;
    case 'Backspace': e.preventDefault(); back(); break;
    case 'Escape': clear(); break;
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  if (copyTimer) clearTimeout(copyTimer);
});
</script>
