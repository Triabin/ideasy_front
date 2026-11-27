<!-- 简繁转换工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">简繁转换</h1>
    <p class="text-sm opacity-70 text-center max-w-2xl w-full self-center">
      基于 OpenCC 词库进行词语级精准转换，能区分「头发 / 干杯 / 后来」等多音字与词汇用法，而非简单的一字对一字替换。
    </p>

    <!-- 转换方案 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 gap-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span class="text-sm font-semibold opacity-60 shrink-0">转换方向</span>
          <div class="join shrink-0">
            <button class="btn btn-sm join-item" :class="direction === 's2t' ? 'btn-primary' : ''"
                    @click="direction = 's2t'">简 → 繁
            </button>
            <button class="btn btn-sm join-item" :class="direction === 't2s' ? 'btn-primary' : ''"
                    @click="direction = 't2s'">繁 → 简
            </button>
          </div>
          <span class="text-sm font-semibold opacity-60 shrink-0">转换方案</span>
          <select v-model="variantKey" class="select select-sm w-full sm:w-72">
            <option v-for="o in options" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
          <span class="badge badge-sm badge-ghost font-mono shrink-0">{{ current.from }} → {{ current.to }}</span>
          <div class="ml-auto flex items-center gap-2 shrink-0">
            <input ref="fileInput" type="file" accept=".txt,text/plain" class="hidden" @change="onFile"/>
            <button class="btn btn-sm" title="上传或拖拽 UTF-8 编码的 TXT 文件" @click="openFilePicker">上传 TXT</button>
            <button class="btn btn-sm" :disabled="!input && !fileName" @click="clearAll">清空</button>
          </div>
        </div>
        <p class="text-xs opacity-60">{{ current.desc }}</p>
        <div v-if="fileName" class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class="badge badge-sm badge-ghost">{{ fileName }}</span>
          <span class="opacity-50">已载入文件内容，可直接在下方编辑</span>
          <button class="btn btn-ghost btn-xs btn-circle" title="移除文件标记" @click="fileName = ''">
            <Close class="size-3"/>
          </button>
        </div>
      </div>
    </div>

    <!-- 输入 / 输出 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-sm font-semibold opacity-60">{{ direction === 's2t' ? '简体原文' : '繁体原文' }}</span>
          <div class="flex items-center gap-1">
            <button class="btn btn-ghost btn-xs" title="填入示例文本" @click="useSample">示例</button>
            <span class="text-xs opacity-40 font-mono">{{ formatCount(input.length) }}</span>
          </div>
        </div>
        <textarea
            v-model="input"
            class="textarea textarea-md w-full h-80 resize-y text-sm leading-6"
            :placeholder="direction === 's2t' ? '在此输入或粘贴简体中文…' : '在此输入或粘贴繁体中文…'"
            spellcheck="false"
        ></textarea>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-sm font-semibold opacity-60">{{ direction === 's2t' ? '繁体结果' : '简体结果' }}</span>
          <div class="flex items-center gap-1">
            <template v-if="converting">
              <span class="loading loading-spinner loading-xs opacity-60"></span>
              <span class="text-xs opacity-50 font-mono">转换中 {{ Math.round(progress * 100) }}%</span>
            </template>
            <template v-else>
              <span class="text-xs opacity-40 font-mono">{{ formatCount(output.length) }}</span>
              <CopyBtn :value="output" label="复制" title="复制转换结果" popup-toast="on"/>
            </template>
            <button class="btn btn-primary btn-sm" :disabled="!output || converting" title="下载为 UTF-8 TXT 文件"
                    @click="downloadFile">下载 TXT
            </button>
          </div>
        </div>
        <textarea
            :value="output"
            readonly
            class="textarea textarea-md w-full h-80 resize-y text-sm leading-6 bg-base-200"
            placeholder="转换结果会显示在这里"
            spellcheck="false"
        ></textarea>
        <progress v-if="converting" class="progress progress-primary w-full h-1" :value="progress * 100"
                  max="100"></progress>
      </div>
    </div>

    <!-- 词库级差异示例 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">为什么不是简单的字对字转换？</h2>
        <p class="text-sm opacity-80 leading-relaxed">
          OpenCC 会先按词库对文本分词，再根据词语整体选择正确写法。例如「干杯」的「干」转为「乾」，而「皇后」保持不变；
          「头发」的「发」转为「髮」，而「发展」的「发」转为「發」。
        </p>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
            <tr class="text-xs opacity-60">
              <th>简体</th>
              <th>通用繁体</th>
              <th>台湾正体（含词汇）</th>
              <th>说明</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="e in EXAMPLES" :key="e.s">
              <td class="font-medium">{{ e.s }}</td>
              <td class="font-serif">{{ e.t }}</td>
              <td class="font-serif text-primary">{{ e.twp }}</td>
              <td class="text-xs opacity-60">{{ e.note }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 当前方向方案说明 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">{{ direction === 's2t' ? '简体 → 繁体' : '繁体 → 简体' }}方案说明</h2>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
            <tr class="text-xs opacity-60">
              <th>方案</th>
              <th>OpenCC 配置</th>
              <th>说明</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="o in options" :key="o.key" :class="o.key === variantKey ? 'bg-base-100' : ''">
              <td class="whitespace-nowrap">
                <span class="font-medium">{{ o.label }}</span>
                <span v-if="o.recommended" class="badge badge-xs badge-primary badge-soft ml-1">推荐</span>
              </td>
              <td class="font-mono text-xs whitespace-nowrap">{{ o.from }} → {{ o.to }}</td>
              <td class="text-sm opacity-80">{{ o.desc }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 注意事项 -->
    <div class="card bg-base-200 shadow-sm mb-4">
      <div class="card-body p-4 sm:p-5 gap-2">
        <h2 class="text-lg font-semibold">注意事项</h2>
        <ul class="text-sm opacity-80 leading-relaxed flex flex-col gap-1.5 list-disc pl-5">
          <li>所有转换都在本机浏览器内完成，文本不会上传到服务器。</li>
          <li>OpenCC 依赖词库分词，能处理绝大多数多音字与地区词汇，但人名、古语、专业术语仍可能误转；个别跨词边界的情况（如把「个头发」切成「个头 + 发」）也可能判断失误，重要文本请人工校对。</li>
          <li>台湾正体的词汇转换（twp）词库较完整；香港词汇转换（hk）词库相对较小，个别港式用语可能仍保持原样。</li>
          <li>支持点击「上传 TXT」选择文件，也可把 TXT 文件直接拖拽到页面任意位置；仅支持 TXT 文本，单文件最大 50 MB，超过限制的文件会在读取前被拒绝。大文件会按换行 / 句末标点分块转换并显示进度，转换期间请勿关闭页面。文件编码建议使用 UTF-8；下载结果为带 BOM 的 UTF-8 文本，便于 Windows 记事本正确识别中文。</li>
          <li>繁 → 简的「通用简体」只做字形转换；若需要把「軟體」「滑鼠」转成「软件」「鼠标」，请选择「台湾用语 → 普通话」。</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import CopyBtn from '@/components/CopyBtn';
import OpenCC from 'opencc-js';
import { clickDownload, popupToast } from '@/common/utils.ts';
import useFullScreenDropFile from '@/composables/useFullScreenDropFile.ts';

/** 单个转换方案 */
interface ConvertOption {
  key: string;
  label: string;
  from: string;
  to: string;
  desc: string;
  recommended?: boolean;
}

/** 简 → 繁方案 */
const S2T_OPTIONS: ConvertOption[] = [
  {
    key: 'twp',
    label: '台湾正体（含词汇，推荐）',
    from: 'cn',
    to: 'twp',
    desc: '转换字形的同时候选台湾常用词汇，如「软件 → 軟體」「鼠标 → 滑鼠」「自行车 → 腳踏車」。',
    recommended: true
  },
  {
    key: 'tw',
    label: '台湾正体（仅字形）',
    from: 'cn',
    to: 'tw',
    desc: '只做台湾用字与字形转换，不替换地区词汇，如「软件 → 軟件」。'
  },
  {
    key: 't',
    label: '通用繁体（OpenCC 标准）',
    from: 'cn',
    to: 't',
    desc: '不区分地区的标准繁体，适合不确定目标地区用语的通用场景。'
  },
  {
    key: 'hk',
    label: '香港繁体',
    from: 'cn',
    to: 'hk',
    desc: '按香港常用字形转换，如「软件 → 軟件」。'
  }
];

/** 繁 → 简方案 */
const T2S_OPTIONS: ConvertOption[] = [
  {
    key: 'twp2s',
    label: '台湾用语 → 普通话（含词汇，推荐）',
    from: 'twp',
    to: 'cn',
    desc: '转换字形并把台湾词汇还原为简中说法，如「軟體 → 软件」「滑鼠 → 鼠标」「資訊 → 信息」。',
    recommended: true
  },
  {
    key: 'tw2s',
    label: '台湾正体（仅字形）',
    from: 'tw',
    to: 'cn',
    desc: '只做字形转换，保留原有的地区用法，如「軟體 → 软体」。'
  },
  {
    key: 't2s',
    label: '通用简体（OpenCC 标准）',
    from: 't',
    to: 'cn',
    desc: '把繁体字形统一转换为简体，适合不区分来源地区的通用文本。'
  },
  {
    key: 'hk2s',
    label: '香港繁体 → 简体',
    from: 'hk',
    to: 'cn',
    desc: '按香港用字习惯转换，如「軟件 → 软件」「資訊 → 资讯」。'
  }
];

/** 词库级差异示例 */
const EXAMPLES = [
  { s: '头发', t: '頭髮', twp: '頭髮', note: '「发」在这里读 fà，转为「髮」' },
  { s: '发展', t: '發展', twp: '發展', note: '「发」在这里读 fā，转为「發」' },
  { s: '干杯', t: '乾杯', twp: '乾杯', note: '「干」表示干燥，转为「乾」' },
  { s: '皇后', t: '皇后', twp: '皇后', note: '「后」表示君主配偶，保持原字' },
  { s: '后来', t: '後來', twp: '後來', note: '「后」表示时间先后，转为「後」' },
  { s: '软件', t: '軟件', twp: '軟體', note: '台湾习惯称「軟體」' },
  { s: '鼠标', t: '鼠標', twp: '滑鼠', note: '台湾习惯称「滑鼠」' },
  { s: '自行车', t: '自行車', twp: '腳踏車', note: '台湾习惯称「腳踏車」' },
  { s: '信息', t: '信息', twp: '資訊', note: '台湾习惯称「資訊」' }
];

/** 示例文本 */
const SAMPLE = '他剪了头发，干杯之后，后来发现皇后也在。\n软件开发、鼠标、自行车和信息技术，都是常见的词。';
/** 文件大小上限：50 MB（大文件会分块转换，内存峰值与单块大小相关） */
const MAX_FILE_SIZE = 50 * 1024 * 1024;
/** 分块转换的字符数，控制单次转换的内存峰值 */
const CHUNK_SIZE = 200_000;

const direction = ref<'s2t' | 't2s'>('s2t');
const variantKey = ref('twp');
const input = ref('');
const fileName = ref('');
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

/** 支持把 TXT 文件拖拽到页面任意位置上传 */
useFullScreenDropFile(fileInput, {
  accept: ['.txt', 'text/plain'],
  maxSize: MAX_FILE_SIZE,
  maxCount: 1,
  overlayText: '松开鼠标，载入 TXT 文件',
  onReject: (files, reason) => {
    if (reason === 'size') {
      popupToast('文件超过 50 MB，请拆分后再上传', { type: 'error' });
    } else if (reason === 'count') {
      popupToast('一次只能上传一个 TXT 文件', { type: 'warning' });
    } else {
      popupToast(`已忽略非 TXT 文件：${files.map(f => f.name).join('、')}`, { type: 'warning', duration: 2000 });
    }
  }
});

/** 当前方向的全部方案 */
const options = computed(() => (direction.value === 's2t' ? S2T_OPTIONS : T2S_OPTIONS));

/** 当前选中的方案 */
const current = computed<ConvertOption>(() =>
    options.value.find(o => o.key === variantKey.value) ?? options.value[0]);

/** 切换方向时重置为该方向的默认方案 */
watch(direction, (dir) => {
  variantKey.value = dir === 's2t' ? 'twp' : 'twp2s';
});

/** 转换器缓存，避免每次输入都重新构建词库 */
const converterCache = new Map<string, (text: string) => string>();

const convertText = (text: string, option: ConvertOption): string => {
  const cacheKey = `${option.from}->${option.to}`;
  let converter = converterCache.get(cacheKey);
  if (!converter) {
    converter = OpenCC.Converter({ from: option.from, to: option.to });
    converterCache.set(cacheKey, converter);
  }
  return converter(text);
};

/** 按换行 / 句末标点切分文本，避免单次转换占用过多内存 */
function splitText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxLength, text.length);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const newline = slice.lastIndexOf('\n');
      const punctuation = Math.max(
          slice.lastIndexOf('。'),
          slice.lastIndexOf('！'),
          slice.lastIndexOf('？'),
          slice.lastIndexOf('；')
      );
      const cut = Math.max(newline, punctuation);
      // 切分点太靠前时不如直接按长度硬切，避免产生过多碎片
      if (cut > maxLength / 2) end = start + cut + 1;
    }
    // 避免把代理对（如 emoji）从中间切断
    if (end < text.length) {
      const code = text.charCodeAt(end - 1);
      if (code >= 0xd800 && code <= 0xdbff) end -= 1;
    }
    if (end <= start) end = Math.min(start + maxLength, text.length);
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

const output = ref('');
const converting = ref(false);
const progress = ref(0);

/** 转换任务编号，用于丢弃已过期的转换结果 */
let convertTaskId = 0;
let convertTimer: ReturnType<typeof setTimeout> | undefined;

/** 分块转换并逐块让出主线程，避免大文件卡死页面或产生内存峰值 */
const runConvert = async (taskId: number) => {
  const text = input.value;
  const option = current.value;
  const chunks = splitText(text, CHUNK_SIZE);
  const parts: string[] = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      if (taskId !== convertTaskId) return;
      parts.push(convertText(chunks[i], option));
      progress.value = (i + 1) / chunks.length;
      // 让出主线程，使进度能够刷新并保持页面可响应
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (taskId !== convertTaskId) return;
    output.value = parts.join('');
    progress.value = 1;
  } catch {
    if (taskId === convertTaskId) popupToast('转换失败，请检查文本内容', { type: 'error' });
  } finally {
    if (taskId === convertTaskId) converting.value = false;
  }
};

/** 输入或方案变化后延迟转换，避免连续输入时反复处理全文 */
const scheduleConvert = () => {
  const taskId = ++convertTaskId;
  clearTimeout(convertTimer);
  if (!input.value) {
    output.value = '';
    converting.value = false;
    progress.value = 0;
    return;
  }
  converting.value = true;
  progress.value = 0;
  convertTimer = setTimeout(() => runConvert(taskId), 160);
};

watch([input, current], scheduleConvert, { immediate: true });

onBeforeUnmount(() => {
  clearTimeout(convertTimer);
  convertTaskId++;
});

/** 字数展示：超过一万时以「万字」为单位 */
const formatCount = (length: number): string =>
    length >= 10000 ? `${(length / 10000).toFixed(1)} 万字` : `${length} 字`;

/** 打开文件选择框 */
const openFilePicker = () => fileInput.value?.click();

/** 读取 TXT 文件 */
const onFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  if (!/\.txt$/i.test(file.name) && file.type !== 'text/plain') {
    popupToast('请上传 .txt 文本文件', { type: 'warning' });
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    popupToast('文件超过 50 MB，请拆分后再上传', { type: 'error' });
    return;
  }
  try {
    input.value = (await file.text()).replace(/^\uFEFF/, '');
    fileName.value = file.name;
    const sizeMb = file.size / 1024 / 1024;
    const large = sizeMb >= 10;
    popupToast(
        `已载入 ${file.name}（${sizeMb.toFixed(1)} MB）${large ? '，将分块转换，请稍候' : ''}`,
        { type: 'success', duration: large ? 2500 : 1500, vertical: 'bottom' }
    );
  } catch {
    popupToast('文件读取失败，请确认文件编码为 UTF-8', { type: 'error' });
  }
};

/** 填入示例文本 */
const useSample = () => {
  input.value = SAMPLE;
  fileName.value = '';
};

/** 清空输入与文件 */
const clearAll = () => {
  input.value = '';
  fileName.value = '';
};

/** 下载转换结果 */
const downloadFile = () => {
  if (!output.value || converting.value) return;
  clickDownload(
      // 带 BOM 的 UTF-8，避免 Windows 记事本打开时中文乱码
      `\uFEFF${output.value}`,
      'text/plain',
      () => {
        const dirLabel = direction.value === 's2t' ? '繁体' : '简体';
        const base = fileName.value ? fileName.value.replace(/\.txt$/i, '') : '简繁转换结果';
        return `${base}_${dirLabel}.txt`;
      });
};
</script>
