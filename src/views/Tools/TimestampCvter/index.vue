<!-- 时间戳转换工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">时间戳转换</h1>
    <p class="text-sm opacity-70 text-center">获取当前时间戳，支持秒/毫秒/微秒/纳秒与日期时间互转、多格式展示与时区选择。</p>

    <!-- 当前时间戳 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="card-title text-base">当前时间戳</h2>
          <label class="join ml-auto">
            <button class="btn btn-sm join-item pointer-events-none">实时刷新</button>
            <select v-model.number="liveInterval" class="select select-sm join-item w-28 font-mono">
              <option :value="0">关闭</option>
              <option :value="500">0.5 秒</option>
              <option :value="1000">1 秒</option>
            </select>
          </label>
          <button class="btn btn-sm btn-primary shrink-0" @click="useNow">使用当前时间</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          <div
              v-for="item in nowItems"
              :key="item.label"
              class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:shadow transition-shadow select-all"
              :title="`点击复制 ${item.label}`"
              @click="copy(item.value)"
          >
            <div class="flex flex-col min-w-0">
              <i class="text-xs opacity-60">{{ item.label }}</i>
              <span class="font-mono break-all">{{ item.value }}</span>
            </div>
            <div class="shrink-0 opacity-60">
              <Copied v-if="copiedText === item.value" :size="16" :twClasses="['fill-success']"/>
              <Copy v-else :size="16"/>
            </div>
          </div>
        </div>
      </div>
    </div>

    <details class="collapse collapse-arrow bg-base-100 border border-base-300">
      <summary class="collapse-title font-semibold">关于时间的一些地理知识</summary>
      <div class="collapse-content text-sm text-base-content/75 leading-6 indent-8">
        <p>以前，以地球0度经线位的时间为标准时间（本初子午线），英国伦敦的格林威（尼）治天文台就在这条线上，因此以前的世界时间也叫格林威治时间（Greenwich Mean Time，即<b>GMT</b>）。</p>
        <p>对于地球上的每一个地方来说，太阳直射时为正午12点，地球上的时间需要一个统一的计算标准，而计算的核心就是地球的自转，地球自转一周是24小时，于是将地球从经度方向分为24个不同的时区，本初子午线所在时区为零时区，往西为西时区共12个，与本初子午线每差一个时区时间就早一个小时；往东为东时区也是12个，东西第十二区重叠在一起（注意，重叠在一起，不代表时间相同，因为时间实际上是人为规定的），时区与本初子午线每差一个时区时间就往后晚一个小时。</p>
        <p>中国所使用的时间北京时间就是东八区时间，而东八区的标准时间实际上在上海，因此Linux系统或者一些地方表示中国时间的时候只能选 <code>Asia/Shanghai</code>。</p>
        <p>由于东西十二区重叠，为了避免该时区内的人日期混乱，于是规定了一条国际日期变更线（日界线），变更线东侧日期减一天，西侧日期加一天。为了避免同一个国家/地区两个时间的尴尬情况，该变更线从180度经线附近延伸出来后多处采用曲折走向避开陆地，并且也经过多次变更。</p>
        <p>然而，实际上地球的自转并不是均匀的，这就导致出现记录的实际时间与自转时间存在误差的情况（据统计，最大误差长达16分钟）。2012年1月，取消用了将近130年的格林威治标准时间，标准时间改为使用原子钟提供。</p>
        <p>原子钟是利用铯原子的震动频率计算出来的时间作为世界标准时间（Coordinated Universal Time，<b>UTC</b>），铯原子每震动9192631770次等于1秒。</p>
      </div>
    </details>

    <!-- 时区设置（两个方向共用） -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body py-3">
        <div class="flex flex-wrap items-center gap-3 text-sm">
          <span class="opacity-60 shrink-0">显示/解析时区：</span>
          <div class="btn-group">
            <button class="btn btn-sm" :class="tzMode === 'local' ? 'btn-primary' : ''" @click="tzMode = 'local'">本地</button>
            <button class="btn btn-sm" :class="tzMode === 'utc' ? 'btn-primary' : ''" @click="tzMode = 'utc'">UTC</button>
            <button class="btn btn-sm" :class="tzMode === 'offset' ? 'btn-primary' : ''" @click="tzMode = 'offset'">指定偏移</button>
          </div>
          <label v-if="tzMode === 'offset'" class="join">
            <span class="label mr-2">偏移量</span>
            <input
                type="number"
                class="input input-sm join-item w-24 font-mono"
                min="-12"
                max="14"
                step="0.25"
                v-model.number="tzOffsetHours"
            />
          </label>
          <span class="badge badge-outline font-mono shrink-0">{{ tzLabel || '本地时区' }}</span>
        </div>
      </div>
    </div>

    <!-- 时间戳 -> 日期时间 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">时间戳 → 日期时间</h2>
        <div class="flex flex-wrap items-center gap-3">
          <label class="join shrink-0">
            <span class="label mr-2">单位</span>
            <select v-model="tsUnit" class="select select-sm join-item w-36">
              <option value="auto">自动识别</option>
              <option value="s">秒（s）</option>
              <option value="ms">毫秒（ms）</option>
              <option value="us">微秒（μs）</option>
              <option value="ns">纳秒（ns）</option>
            </select>
          </label>
          <label class="input grow items-center gap-2 min-w-60" :class="{ 'input-error': !!tsError }">
            <span class="opacity-60 shrink-0">时间戳</span>
            <input
                type="number"
                class="grow font-mono"
                v-model="tsInput"
                placeholder="如：1760000000 / 1760000000000"
                spellcheck="false"
            />
          </label>
          <button class="btn btn-sm shrink-0" @click="convertTsToNow">取当前值</button>
        </div>
        <div v-if="tsError" class="text-error text-sm">{{ tsError }}</div>

        <template v-if="parsedMs !== null">
          <!-- 常用格式（点击复制） -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
                v-for="fmt in formatResults"
                :key="fmt.key"
                class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:shadow transition-shadow"
                title="点击复制"
                @click="copy(fmt.value)"
            >
              <div class="flex flex-col min-w-0">
                <i class="text-xs opacity-60">{{ fmt.label }}</i>
                <span class="font-mono break-all">{{ fmt.value }}</span>
              </div>
              <div class="shrink-0 opacity-60">
                <Copied v-if="copiedText === fmt.value" :size="16" :twClasses="['fill-success']"/>
                <Copy v-else :size="16"/>
              </div>
            </div>
          </div>

          <!-- 自定义格式 -->
          <div class="flex flex-wrap items-center gap-3">
            <label class="input grow items-center gap-2 min-w-60">
              <span class="opacity-60 shrink-0">自定义格式</span>
              <input
                  type="text"
                  class="grow font-mono"
                  v-model="customTemplate"
                  placeholder="yyyy-MM-dd HH:mm:ss.SSS"
                  spellcheck="false"
                  @blur="rememberCustomTemplate"
                  @keyup.enter="rememberCustomTemplate"
              />
            </label>
            <span class="font-mono text-lg shrink-0">{{ customFormatted }}{{ tzLabel }}</span>
          </div>
          <p class="text-xs opacity-50">
            格式符：y 年、M 月、d 日、H 时（24 制）、h 时（12 制）、m 分、s 秒、S 毫秒、q 季度数字、Q 季度汉字、E/EE/EEE 星期、e/ee/eee 英文星期、ap/AP 上下午、Z 时区；重复字符数量决定补零位数（y 为 2 位时取年份后两位）；需要原样输出的内容用方括号包裹，如 yyyy-MM-dd HH:mm:ss [GMT]Z => {{new Date(parsedMs || Date.now()).format('yyyy-MM-dd HH:mm:ss [GMT]Z')}}。
          </p>
          <div v-if="customFormatHistory.length" class="flex flex-wrap items-center gap-2">
            <span class="text-xs opacity-50">历史格式</span>
            <span
                v-for="item in customFormatHistory"
                :key="item"
                class="badge badge-outline gap-1 font-mono"
            >
              <button class="max-w-64 truncate hover:text-primary" :title="`点击使用 ${item}`" @click="customTemplate = item">{{ item }}</button>
              <button class="opacity-50 hover:text-error" title="删除该记录" @click="removeCustomHistory(item)">×</button>
            </span>
          </div>

          <!-- 附加信息 -->
          <div class="flex flex-wrap gap-2 text-sm">
            <span class="badge badge-outline font-mono">{{ weekdayName }}</span>
            <span class="badge badge-outline font-mono">Unix 秒 {{ Math.floor(parsedMs / 1000) }}</span>
            <span class="badge badge-outline font-mono">识别单位：{{ UNIT_NAMES[detectedUnit] }}</span>
            <span class="badge" :class="diff.future ? 'badge-info' : 'badge-ghost'">
              {{ diff.future ? '距现在还有' : '已过' }} {{ diff.desc }}
            </span>
          </div>
        </template>
      </div>
    </div>

    <!-- 日期时间 -> 时间戳 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">日期时间 → 时间戳</h2>
        <div class="flex flex-wrap items-center gap-3">
          <label class="input grow items-center gap-2 min-w-60" :class="{ 'input-error': !!dtError }">
            <span class="opacity-60 shrink-0">日期时间</span>
            <input
                type="text"
                class="grow font-mono"
                v-model="dtInput"
                placeholder="如：2026-10-19 12:00:00"
                spellcheck="false"
                @blur="rememberDtFormat"
                @keyup.enter="rememberDtFormat"
            />
          </label>
          <label class="input grow items-center gap-2 min-w-60" :class="{ 'input-error': !!dtError }">
            <span class="opacity-60 shrink-0">格式</span>
            <input
                type="text"
                class="grow font-mono"
                v-model="dtFormat"
                placeholder="如：yyyy-MM-dd HH:mm:ss"
                spellcheck="false"
                @blur="rememberDtFormat"
                @keyup.enter="rememberDtFormat"
            />
          </label>
        </div>
        <p class="text-xs opacity-50">
          解析支持 y、M、d、H、h、m、s、S、ap/AP、Z 与 [字面量]；格式中缺少的日期取今天、时间取 0；含 Z 时以字符串中的时区为准，否则按上方所选时区解析。
        </p>
        <div v-if="dtFormatHistory.length" class="flex flex-wrap items-center gap-2">
          <span class="text-xs opacity-50">历史格式</span>
          <span
              v-for="item in dtFormatHistory"
              :key="item"
              class="badge badge-outline gap-1 font-mono"
          >
            <button class="max-w-64 truncate hover:text-primary" :title="`点击使用 ${item}`" @click="dtFormat = item">{{ item }}</button>
            <button class="opacity-50 hover:text-error" title="删除该记录" @click="removeDtHistory(item)">×</button>
          </span>
        </div>
        <div v-if="dtError" class="text-error text-sm">{{ dtError }}</div>
        <div v-else-if="dtMs !== null" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          <div
              v-for="item in dtOutItems"
              :key="item.label"
              class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:shadow transition-shadow select-all"
              :title="`点击复制 ${item.label}`"
              @click="copy(item.value)"
          >
            <div class="flex flex-col min-w-0">
              <i class="text-xs opacity-60">{{ item.label }}</i>
              <span class="font-mono break-all">{{ item.value }}</span>
            </div>
            <div class="shrink-0 opacity-60">
              <Copied v-if="copiedText === item.value" :size="16" :twClasses="['fill-success']"/>
              <Copy v-else :size="16"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { copyText, popupTip } from '@/common/utils.ts';
import {
  FORMAT_PRESETS,
  describeDiff,
  formatDate,
  parseDateTimeByFormat,
  parseTimestampText,
  type ParsedTimestamp,
  type TimeUnit,
  type TimeZoneMode,
} from './timestampConverter';

const UNIT_NAMES: Record<string, string> = { s: '秒', ms: '毫秒', us: '微秒', ns: '纳秒' };

/* ------------------------- 公共状态 ------------------------- */
const tzMode = ref<TimeZoneMode>('local');
const tzOffsetHours = ref<number>(-(new Date().getTimezoneOffset() / 60));
const copiedText = ref<string>('');

const tzLabel = computed(() => {
  if (tzMode.value === 'utc') return 'UTC';
  if (tzMode.value === 'offset') {
    const sign = tzOffsetHours.value >= 0 ? '+' : '-';
    const h = Math.abs(tzOffsetHours.value);
    const hh = Math.floor(h);
    const mmm = Math.round((h - hh) * 60);
    return `GMT${sign}${hh}${mmm ? ':' + String(mmm).padStart(2, '0') : ''}`;
  }
  return '';
});

let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text) return;
  await copyText(text);
  copiedText.value = text;
  popupTip(`已复制 ${text.length > 16 ? (text.slice(0, 8) + '…' + text.slice(-6)) : text}`, { type: 'success', duration: 1500 });
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
};

/* ------------------------- 当前时间戳 ------------------------- */
const liveNowMs = ref<number>(Date.now());
const liveInterval = ref<number>(1000);
let liveTimer: ReturnType<typeof setInterval> | null = null;
const startLive = () => {
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = null;
  if (liveInterval.value > 0) {
    liveTimer = setInterval(() => (liveNowMs.value = Date.now()), liveInterval.value);
  }
};
watch(liveInterval, startLive);
startLive();
onBeforeUnmount(() => liveTimer && clearInterval(liveTimer));

const nowItems = computed(() => {
  const ms = liveNowMs.value;
  return [
    { label: '秒（s）', value: `${Math.floor(ms / 1000)}` },
    { label: '毫秒（ms）', value: `${ms}` },
    { label: '微秒（μs）', value: `${ms * 1000}` },
    { label: '纳秒（ns）', value: `${ms * 1e6}` },
  ];
});

/** 将当前时间填入时间戳输入框 */
const useNow = () => {
  tsInput.value = `${Date.now()}`;
  tsUnit.value = 'auto';
};

/* ------------------------- 时间戳 -> 日期时间 ------------------------- */
const tsInput = ref<string>(`${Date.now()}`);
const tsUnit = ref<TimeUnit>('auto');
const customTemplate = ref<string>('yyyy-MM-dd HH:mm:ss.SSS');

const parsed = computed<ParsedTimestamp | null>(() => {
  const raw = tsInput.value.trim();
  if (!raw) return null;
  return parseTimestampText(raw, tsUnit.value);
});

const tsError = computed(() => {
  const raw = tsInput.value.trim();
  if (!raw) return '';
  if (!/^-?[\d,_\s.]+$/.test(raw)) return '时间戳只能是数字（可含分隔符 _ , 空格）';
  if (parsed.value === null) return '数值超出可表示的时间范围或格式不合法';
  return '';
});

const parsedMs = computed(() => parsed.value?.ms ?? null);
const detectedUnit = computed(() => parsed.value?.unit ?? 'ms');

const formatResults = computed(() => {
  const ms = parsedMs.value;
  if (ms === null) return [];
  return FORMAT_PRESETS.map(p => ({
    key: p.key,
    label: p.label + (tzLabel.value ? `（${tzLabel.value}）` : ''),
    value: formatDate(ms, p.pattern, tzMode.value, tzOffsetHours.value),
  }));
});

const customFormatted = computed(() => {
  const ms = parsedMs.value;
  if (ms === null) return '';
  return formatDate(ms, customTemplate.value, tzMode.value, tzOffsetHours.value);
});

const weekdayName = computed(() =>
    parsedMs.value !== null ? formatDate(parsedMs.value, 'EE', tzMode.value, tzOffsetHours.value) : ''
);

const diff = computed(() => {
  if (parsedMs.value === null) return { diffMs: 0, future: true, desc: '' };
  return describeDiff(parsedMs.value);
});

/** 把当前时间戳按所选单位填入输入框 */
const convertTsToNow = () => {
  const ms = Date.now();
  const map: Record<string, number> = { s: Math.floor(ms / 1000), ms, us: ms * 1000, ns: ms * 1e6 };
  tsInput.value = tsUnit.value === 'auto' ? `${ms}` : `${map[tsUnit.value]}`;
};

/* ------------------------- 日期时间 -> 时间戳 ------------------------- */
const dtFormat = ref<string>('yyyy-MM-dd HH:mm:ss');
const dtInput = ref<string>(new Date().format(dtFormat.value));

const dtMs = computed<number | null>(() =>
    parseDateTimeByFormat(dtInput.value, dtFormat.value, tzMode.value, tzOffsetHours.value)
);

const dtError = computed(() => {
  const raw = dtInput.value.trim();
  if (!raw) return '';
  if (dtMs.value !== null) return '';
  if (!dtFormat.value.trim()) return '请填写与日期时间对应的格式串';
  if (/^-?\d+$/.test(raw)) return '这是纯数字，请在上方“时间戳 → 日期时间”中转换';
  return '日期时间与格式不匹配，请检查两者是否对应';
});

/* ------------------------- 格式历史记录（本地存储，最多 5 条） ------------------------- */
const CUSTOM_FORMAT_HISTORY_KEY = 'timestampCvter:custom-formats';
const DT_FORMAT_HISTORY_KEY = 'timestampCvter:datetime-formats';
const FORMAT_HISTORY_MAX = 5;

const readFormatHistory = (key: string): string[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(stored)
      ? stored.filter((item): item is string => typeof item === 'string').slice(0, FORMAT_HISTORY_MAX)
      : [];
  } catch {
    return [];
  }
};

const writeFormatHistory = (key: string, list: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // 本地存储不可用时仅保留内存中的记录
  }
};

const customFormatHistory = ref<string[]>(readFormatHistory(CUSTOM_FORMAT_HISTORY_KEY));
const dtFormatHistory = ref<string[]>(readFormatHistory(DT_FORMAT_HISTORY_KEY));

/** 记录一条格式：去重后置顶，最多保留 FORMAT_HISTORY_MAX 条 */
const rememberFormat = (key: string, history: Ref<string[]>, value: string) => {
  const format = value.trim();
  if (!format) return;
  history.value = [format, ...history.value.filter(item => item !== format)].slice(0, FORMAT_HISTORY_MAX);
  writeFormatHistory(key, history.value);
};

const forgetFormat = (key: string, history: Ref<string[]>, value: string) => {
  history.value = history.value.filter(item => item !== value);
  writeFormatHistory(key, history.value);
};

/** 自定义格式：输入完成即记录 */
const rememberCustomTemplate = () => {
  rememberFormat(CUSTOM_FORMAT_HISTORY_KEY, customFormatHistory, customTemplate.value);
};

/** 日期时间格式：仅在当前转换成功时记录 */
const rememberDtFormat = () => {
  if (dtMs.value !== null) rememberFormat(DT_FORMAT_HISTORY_KEY, dtFormatHistory, dtFormat.value);
};

const removeCustomHistory = (item: string) => forgetFormat(CUSTOM_FORMAT_HISTORY_KEY, customFormatHistory, item);
const removeDtHistory = (item: string) => forgetFormat(DT_FORMAT_HISTORY_KEY, dtFormatHistory, item);

const dtOutItems = computed(() => {
  const ms = dtMs.value;
  if (ms === null) return [];
  return [
    { label: '秒（s）', value: `${Math.floor(ms / 1000)}` },
    { label: '毫秒（ms）', value: `${ms}` },
    { label: '微秒（μs）', value: `${ms * 1000}` },
    { label: '纳秒（ns）', value: `${ms * 1e6}` },
  ];
});
</script>
