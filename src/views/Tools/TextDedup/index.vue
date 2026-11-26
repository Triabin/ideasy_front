<!-- 文本去重工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">文本去重</h1>
    <p class="text-sm opacity-70 text-center">按字符或按行去除文本中的重复内容，支持保持原序或排序输出。</p>

    <!-- 输入区 -->
    <textarea
        v-model="inputText"
        class="textarea textarea-md w-full min-h-48 resize-y font-mono text-sm"
        placeholder="粘贴或输入文本"
        spellcheck="false"
    ></textarea>

    <!-- 选项栏 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body py-3 flex-row flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs opacity-60">去重单位</span>
          <div class="join">
            <button class="btn btn-sm join-item" :class="{ 'btn-primary': unit === 'char' }" @click="unit = 'char'">按字符</button>
            <button class="btn btn-sm join-item" :class="{ 'btn-primary': unit === 'line' }" @click="unit = 'line'">按行</button>
          </div>
        </div>
        <label class="flex items-center gap-2 cursor-pointer select-none shrink-0" :title="orderHint">
          <input type="checkbox" class="toggle toggle-primary toggle-sm" v-model="keepOrder"/>
          <span>保持原序</span>
          <span class="text-xs opacity-50">{{ orderHint }}</span>
        </label>
        <div class="ml-auto flex items-center gap-1 shrink-0">
          <button class="btn btn-sm btn-ghost" :disabled="!hasInput" @click="inputText = ''">清空</button>
        </div>
      </div>
    </div>

    <!-- 去重结果 -->
    <div v-if="hasInput" class="card bg-base-200 shadow-sm">
      <div class="card-body p-3 gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-sm text-base-content">去重结果</span>
          <div class="flex flex-wrap items-center gap-1">
            <span class="badge badge-ghost badge-outline font-mono">原始 {{ stats.total }} {{ unitLabel }}</span>
            <span class="badge badge-success badge-outline font-mono">结果 {{ stats.unique }} {{ unitLabel }}</span>
            <span v-if="stats.removed" class="badge badge-error badge-outline font-mono">去除 {{ stats.removed }} 个重复</span>
            <CopyBtn :value="resultText" label="复制结果" title="复制全部去重结果" popup-toast="on"/>
          </div>
        </div>

        <!-- 结果展示区：点击任意位置即可复制完整结果 -->
        <div
            class="relative min-h-24 max-h-104 overflow-y-auto cursor-pointer select-none rounded-box border border-base-300 bg-base-100 transition-colors hover:border-primary/60"
            role="button"
            tabindex="0"
            title="点击复制全部结果"
            @click="copyResult"
            @keydown.enter.prevent="copyResult"
            @keydown.space.prevent="copyResult"
        >
          <!-- 按字符：以色块逐个展示，空白与控制字符显示为可见符号 -->
          <div v-if="unit === 'char'" class="flex flex-wrap content-start gap-1 p-3">
            <span
                v-for="(tk, i) in charChips" :key="i"
                class="badge h-auto min-h-6 border font-mono" :class="tk.cls" :title="tk.tip"
            >{{ tk.text }}</span>
            <span v-if="omitted" class="badge badge-ghost h-auto min-h-6 border-transparent font-mono">
              …其余 {{ omitted }} 个字符未展示，点击仍可复制完整结果
            </span>
          </div>

          <!-- 按行：带行号逐行展示，长行自动换行 -->
          <div v-else class="flex flex-col gap-0.5 p-2 font-mono text-sm">
            <div v-for="(line, i) in lineRows" :key="i" class="flex items-start gap-2 rounded-sm px-1 hover:bg-base-200">
              <span class="w-8 shrink-0 text-right text-xs opacity-40 tabular-nums leading-6">{{ i + 1 }}</span>
              <span class="break-all whitespace-pre-wrap leading-6" :class="line ? '' : 'opacity-40 italic'">{{ line || '（空行）' }}</span>
            </div>
            <div v-if="omitted" class="px-1 text-xs opacity-50">…其余 {{ omitted }} 行未展示，点击仍可复制完整结果</div>
          </div>
        </div>

        <!-- 字符分类图例 -->
        <div v-if="unit === 'char'" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-60">
          <span>图例：</span>
          <span v-for="item in legend" :key="item.label" class="flex items-center gap-1">
            <span class="badge badge-xs border" :class="item.cls"></span>
            {{ item.label }}
          </span>
          <span class="opacity-70">（悬浮色块可查看字符编码）</span>
        </div>
      </div>
    </div>

    <!-- 初始提示 -->
    <div v-if="!hasInput" class="text-center opacity-40 py-10 text-sm">
      在上方输入文本即可自动去重：默认逐个字符去重并保持首次出现的顺序；关闭「保持原序」后按字符编码排序输出；也可切换为按行去重（按行时忽略回车符，输出统一以换行符分隔）。
    </div>
  </div>
</template>
<script lang="ts" setup>
import CopyBtn from '@/components/CopyBtn';
import { computed, onBeforeUnmount, ref } from 'vue';
import { copyText, popupToast } from '@/common/utils';

/** 去重单位：char 逐个字符，line 逐行 */
type Unit = 'char' | 'line';
/** 展示用的字符色块 */
type Chip = { text: string; cls: string; tip: string };

/** 结果区最多渲染的条目数，超出部分不渲染（复制的仍是完整结果） */
const MAX_RENDER = 2000;

const inputText = ref<string>('');
const unit = ref<Unit>('char');
const keepOrder = ref<boolean>(true);

const hasInput = computed(() => inputText.value !== '');
const unitLabel = computed(() => (unit.value === 'char' ? '字符' : '行'));
const orderHint = computed(() => (keepOrder.value
    ? '按首次出现的顺序输出'
    : unit.value === 'char' ? '关闭后按字符编码排序输出' : '关闭后按字典序排序输出'));

/** 输入拆分出的待去重单元（Array.from 按码点切分，emoji 等代理对不会被拆散） */
const inputTokens = computed<string[]>(() => {
  const str = inputText.value;
  if (!str) return [];
  return unit.value === 'char' ? Array.from(str) : str.split(/\r\n|\r|\n/);
});

/** 去重（+可选排序）后的单元列表 */
const uniqueTokens = computed<string[]>(() => {
  // Set 天然按首次插入顺序去重
  const list = Array.from(new Set(inputTokens.value));
  if (keepOrder.value) return list;
  return unit.value === 'char'
      ? list.sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)
      : list.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));
});

/** 完整结果文本（复制时使用，保留真实换行与空格） */
const resultText = computed(() => uniqueTokens.value.join(unit.value === 'char' ? '' : '\n'));

const stats = computed(() => {
  const total = inputTokens.value.length;
  const unique = uniqueTokens.value.length;
  return { total, unique, removed: Math.max(total - unique, 0) };
});

/** 常见空白字符的可见替代符号与名称（用码点做键，避免源码里出现不可见字符） */
const INVISIBLE: Record<number, { text: string; name: string }> = {
  0x09: { text: '⇥', name: '制表符' },
  0x0a: { text: '↵', name: '换行' },
  0x0b: { text: '␋', name: '垂直制表符' },
  0x0c: { text: '␌', name: '换页' },
  0x0d: { text: '␍', name: '回车' },
  0x20: { text: '␣', name: '空格' },
  0x85: { text: '␤', name: '下一行' },
  0xa0: { text: '␠', name: '不换行空格' },
  0x3000: { text: '␣', name: '全角空格' },
};
/** 字符分类对应的色块样式（类名必须写全，否则构建时不会被打进样式包） */
const CHIP_CLS = {
  ws: 'badge-dash border-base-content/40 text-base-content/70',
  digit: 'badge-soft badge-info border-transparent',
  latin: 'badge-soft badge-primary border-transparent',
  cjk: 'badge-soft badge-secondary border-transparent',
  punct: 'badge-soft badge-warning border-transparent',
  other: 'badge-soft badge-neutral border-transparent',
} as const;
const legend: { label: string; cls: string }[] = [
  { label: '字母', cls: CHIP_CLS.latin },
  { label: '数字', cls: CHIP_CLS.digit },
  { label: '中文/全角', cls: CHIP_CLS.cjk },
  { label: '标点/符号', cls: CHIP_CLS.punct },
  { label: '空白/控制符', cls: CHIP_CLS.ws },
  { label: '其他', cls: CHIP_CLS.other },
];

/** 判断字符所属分类 */
const classify = (c: string): keyof typeof CHIP_CLS => {
  const cp = c.codePointAt(0)!;
  // 空白字符（含全角空格、不换行空格、零宽不换行空格等）与控制字符统一归为不可见字符
  if (/\s/.test(c) || cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f)) return 'ws';
  if (cp >= 0x30 && cp <= 0x39) return 'digit';
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return 'latin';
  // CJK 统一表意文字（含扩展A、兼容区）+ 中文标点 + 全角字符
  if ((cp >= 0x3000 && cp <= 0x303f) || (cp >= 0x3400 && cp <= 0x4dbf)
      || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff)
      || (cp >= 0xff00 && cp <= 0xffef)) return 'cjk';
  if (/\p{P}|\p{S}/u.test(c)) return 'punct';
  return 'other';
};

const toChip = (c: string): Chip => {
  const kind = classify(c);
  const cp = c.codePointAt(0)!;
  const code = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  const known = INVISIBLE[cp];
  if (known) return { text: known.text, cls: CHIP_CLS[kind], tip: `${known.name} ${code}` };
  // 其余不可见字符（零宽字符、C0/C1 控制符等）直接展示码点，避免出现"看不见的空色块"
  if (kind === 'ws') return { text: code, cls: CHIP_CLS.ws, tip: `不可见字符 ${code}` };
  return { text: c, cls: CHIP_CLS[kind], tip: `${c} ${code}` };
};

const charChips = computed<Chip[]>(() => unit.value === 'char' ? uniqueTokens.value.slice(0, MAX_RENDER).map(toChip) : []);
const lineRows = computed<string[]>(() => unit.value === 'line' ? uniqueTokens.value.slice(0, MAX_RENDER) : []);
const omitted = computed(() => Math.max(uniqueTokens.value.length - MAX_RENDER, 0));

/** 点击结果区任意位置复制完整结果 */
const copied = ref<boolean>(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copyResult = async () => {
  const text = resultText.value;
  if (!text) return;
  try {
    await copyText(text);
    copied.value = true;
    popupToast(`已复制 ${stats.value.unique} ${unitLabel.value}去重结果`, { type: 'success', duration: 1200 });
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied.value = false), 900);
  } catch (e: any) {
    popupToast(e?.message ?? '复制失败', { type: 'error', duration: 2500 });
  }
};
onBeforeUnmount(() => copyTimer && clearTimeout(copyTimer));
</script>
