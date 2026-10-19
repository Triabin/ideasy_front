<!-- 时间戳转换工具路由页面 -->
<template>
  <div class="h-full max-h-full w-full flex flex-col gap-4 p-4 overflow-y-auto">
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
            <button class="btn btn-sm join-item pointer-events-none">UTC 偏移</button>
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
            <button class="btn btn-sm join-item pointer-events-none">单位</button>
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
                @keyup.enter="convertTsToNow"
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
              <input type="text" class="grow font-mono" v-model="customTemplate" spellcheck="false"/>
            </label>
            <span class="font-mono text-lg shrink-0">{{ customFormatted }}{{ tzLabel }}</span>
          </div>
          <p class="text-xs opacity-50">占位符：{yyyy} 年、{MM} 月、{dd} 日、{HH} 时、{mm} 分、{ss} 秒、{SSS} 毫秒</p>

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
                placeholder="如：2026-10-19 12:00:00 / 2026-10-19T04:00:00Z"
                spellcheck="false"
            />
          </label>
          <input type="datetime-local" class="input input-sm shrink-0" v-model="dtPicker" @change="onPickerChange"/>
          <button class="btn btn-sm shrink-0" @click="dtInput = nowDateTimeString()">此刻</button>
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { copyText, popupTip } from '@/common/utils.ts';
import {
  FORMAT_PRESETS,
  describeDiff,
  formatByTemplate,
  getWeekdayName,
  parseDateTimeToMs,
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
  popupTip(`已复制 ${text.length > 16 ? text.slice(0, 8) + '…' + text.slice(-6) : text}`, 'success', 1500);
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
const customTemplate = ref<string>('{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}.{SSS}');

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
    value: formatByTemplate(ms, p.template, tzMode.value, tzOffsetHours.value),
  }));
});

const customFormatted = computed(() => {
  const ms = parsedMs.value;
  if (ms === null) return '';
  return formatByTemplate(ms, customTemplate.value, tzMode.value, tzOffsetHours.value);
});

const weekdayName = computed(() =>
    parsedMs.value !== null ? getWeekdayName(parsedMs.value, tzMode.value, tzOffsetHours.value) : ''
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
const nowDateTimeString = () => {
  const f = (n: number, l = 2) => String(n).padStart(l, '0');
  const d = new Date();
  return `${d.getFullYear()}-${f(d.getMonth() + 1)}-${f(d.getDate())} ${f(d.getHours())}:${f(d.getMinutes())}:${f(d.getSeconds())}.${f(d.getMilliseconds(), 3)}`;
};

const dtInput = ref<string>(nowDateTimeString());
const dtPicker = ref<string>('');

const onPickerChange = () => {
  if (dtPicker.value) dtInput.value = dtPicker.value;
};

const dtMs = computed<number | null>(() => parseDateTimeToMs(dtInput.value, tzMode.value, tzOffsetHours.value));

const dtError = computed(() => {
  const raw = dtInput.value.trim();
  if (!raw) return '';
  if (/^-?\d+$/.test(raw)) return '这是纯数字，请在上方“时间戳 → 日期时间”中转换';
  if (dtMs.value === null) return '无法解析该日期时间，请检查格式（如：2026-10-19 12:00:00）';
  return '';
});

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
