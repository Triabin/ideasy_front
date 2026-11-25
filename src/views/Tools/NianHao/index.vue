<!-- 年号查询工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">年号查询</h1>
    <p class="text-sm opacity-70 text-center">
      年号纪年自汉武帝建元元年（公元前 140 年）始，至清宣统帝退位（1912 年 2 月 12 日）终。
      输入一个公历日期，查询当时的年号与在位皇帝。
    </p>

    <!-- 日期输入 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">查询日期</h2>
        <div class="flex flex-wrap items-center gap-2">
          <!-- 公元前 / 公元 -->
          <div class="join">
            <button class="btn btn-sm join-item" :class="{ 'btn-primary': !isBC }" @click="isBC = false">公元</button>
            <button class="btn btn-sm join-item" :class="{ 'btn-primary': isBC }" @click="isBC = true">公元前</button>
          </div>
          <label class="join">
            <span class="join-item btn btn-sm pointer-events-none">年</span>
            <input v-model.number="yearInput" type="number" min="1" :max="isBC ? 9999 : 9999" class="input input-sm join-item input-bordered w-28 font-mono"/>
          </label>
          <select v-model.number="month" class="select select-sm w-20">
            <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>
          </select>
          <select v-model.number="day" class="select select-sm w-20">
            <option v-for="d in daysInMonth" :key="d" :value="d">{{ d }} 日</option>
          </select>
          <button class="btn btn-sm ml-auto" @click="useToday">今天</button>
        </div>

        <!-- 快捷示例 -->
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="opacity-60">试一试：</span>
          <button
              v-for="p in PRESETS"
              :key="p.label"
              class="btn btn-xs btn-ghost border border-base-300"
              @click="applyPreset(p)"
          >{{ p.label }}</button>
        </div>
      </div>
    </div>

    <!-- 查询结果 -->
    <div v-if="validInput" class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="card-title text-base">查询结果</h2>
          <span class="text-xs opacity-60 font-mono">{{ inputDateText }}</span>
          <!-- 上一个 / 下一个年号跳转 -->
          <div class="join ml-auto">
            <button
                class="btn btn-sm join-item"
                :disabled="!prevTarget"
                :title="prevTarget ? `跳转到 ${jumpText(prevTarget)}` : '已是最早的年号（建元）'"
                @click="prevTarget && jumpTo(prevTarget)"
            >‹ 上一个</button>
            <button
                class="btn btn-sm join-item"
                :disabled="!nextTarget"
                :title="nextTarget ? `跳转到 ${jumpText(nextTarget)}` : '已是最晚的年号'"
                @click="nextTarget && jumpTo(nextTarget)"
            >下一个 ›</button>
          </div>
        </div>

        <!-- 主结果 -->
        <template v-if="result.status === 'ok' && primary">
          <div class="rounded-2xl bg-base-100 border border-base-300 px-5 py-6 flex flex-col items-center gap-3 text-center">
            <span class="badge badge-primary badge-outline font-semibold">{{ primary.dynasty }}</span>
            <div class="text-5xl font-serif font-bold tracking-widest select-all">{{ primary.eraText }}</div>
            <div class="text-lg">{{ primary.emperor }}</div>
            <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs opacity-70 font-mono">
              <span>{{ primary.gongyuan }}</span>
              <span>年号行用：{{ primary.span }}</span>
            </div>
            <p v-if="primary.note" class="text-xs opacity-60 max-w-md">{{ primary.note }}</p>
            <button class="btn btn-sm btn-ghost gap-1" title="复制查询结果" @click="copyResult">
              <Copied v-if="copied" :size="16" :twClasses="['fill-success']"/>
              <Copy v-else :size="16"/>
              复制结果
            </button>
          </div>

          <!-- 并立政权年号 -->
          <template v-if="result.matches.length > 1">
            <div class="text-sm opacity-70 mt-1">
              当时天下分裂，与「{{ primary.dynasty }}」并立政权使用的年号还有：
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              <div
                  v-for="m in result.matches.slice(1)"
                  :key="m.dynasty + m.name"
                  class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex flex-col gap-0.5"
              >
                <div class="flex items-center gap-2">
                  <span class="badge badge-sm badge-ghost">{{ m.dynasty }}</span>
                  <span class="font-semibold">{{ m.eraText }}</span>
                </div>
                <span class="text-xs opacity-70">{{ m.emperor }}</span>
                <span v-if="m.note" class="text-xs opacity-50">{{ m.note }}</span>
              </div>
            </div>
          </template>
        </template>

        <!-- 边界与未匹配提示 -->
        <div v-else-if="result.status === 'before'" class="alert alert-info text-sm">
          <span>
            该日期早于<b>汉武帝建元元年（公元前 140 年）</b>。在此之前中国使用王公即位年次纪年（如「鲁隐公元年」）或干支纪年，尚未出现年号。
          </span>
        </div>
        <div v-else-if="result.status === 'ended'" class="alert alert-warning text-sm">
          <span>
            <b>1912 年 2 月 12 日</b>宣统帝溥仪颁布退位诏书，年号纪年随之终结，此后中国改用公元纪年（民国时期曾并行「民国」纪年）。
            此后仅有 1917 年 7 月张勋复辟曾短暂恢复「宣统」年号 12 天。
          </span>
        </div>
        <div v-else class="alert text-sm">
          <span>
            该年份处于年号纪年时代范围内，但未匹配到年号——可能正值政权更迭的空窗期，或属于数据未收录的割据政权（见页末说明）。
          </span>
        </div>
      </div>
    </div>
    <div v-else class="alert alert-error text-sm">请输入有效年份（公元前年份为正整数，最早可查至公元前 140 年）。</div>

    <!-- 年号制度小知识 -->
    <details class="collapse collapse-arrow bg-base-100 border border-base-300">
      <summary class="collapse-title font-semibold">关于年号纪年</summary>
      <div class="collapse-content text-sm text-base-content/75 leading-6 indent-8">
        <p>年号是中国古代帝王用来纪年的名号，一般认为始于<b>汉武帝</b>。汉武帝即位数年后创制「<b>建元</b>」年号，以建元元年（公元前 140 年）为始，此后新君即位或遇祥瑞灾异往往更改年号，称为「改元」。在此之前，史书多以君主即位年次纪年，如「鲁隐公元年」「秦王政二十六年」。</p>
        <p>汉唐之间，一位皇帝在位期间多次改元十分常见，如汉武帝在位 54 年共用 11 个年号，武则天在位期间改元更加频繁，甚至出现过「天册万岁」「万岁登封」这样四字以上的年号。分裂时期，多个政权同时并立，各自建元，同一年份往往对应多个年号。</p>
        <p>自<b>明太祖</b>起形成「一帝一元」的惯例：一位皇帝在位期间只用一个年号（明英宗因复辟例外，用过正统、天顺两个年号）。因此明清皇帝常以年号相称，如嘉靖帝、万历帝、康熙帝、乾隆帝。</p>
        <p>最后一个年号是清朝<b>宣统</b>。1912 年 2 月 12 日，隆裕太后代宣统皇帝溥仪颁布退位诏书，清朝灭亡，延续两千余年的年号纪年就此终结。1917 年 7 月张勋复辟曾短暂恢复宣统年号，前后仅 12 天，成为年号纪年在历史上的最后回响。</p>
      </div>
    </details>

    <!-- 数据说明 -->
    <p class="text-xs opacity-60 text-center">
      数据覆盖{{ coverage.startText }}至{{ coverage.endText }}，共收录 {{ coverage.total }} 个年号（含主要并立政权）。
      改元多在农历岁首，边界年份按整年近似；数据整理自常见史表，短命政权年号或有缺漏，仅供学习参考。
    </p>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { copyText, popupToast } from '@/common/utils.ts';
import { queryNianHao, findEraStart, COVERAGE, type EraJumpTarget } from './nianHao.ts';

/** 快捷示例日期 */
interface Preset {
  label: string;
  bc: boolean;
  year: number;
  month: number;
  day: number;
}

const PRESETS: Preset[] = [
  { label: '建元元年（前 140）', bc: true, year: 140, month: 1, day: 1 },
  { label: '贞观之治（627）', bc: false, year: 627, month: 1, day: 23 },
  { label: '三国鼎立（229）', bc: false, year: 229, month: 6, day: 1 },
  { label: '开元盛世（713）', bc: false, year: 713, month: 12, day: 1 },
  { label: '崇祯末年（1644）', bc: false, year: 1644, month: 4, day: 25 },
  { label: '宣统退位（1912）', bc: false, year: 1912, month: 2, day: 12 },
  { label: '张勋复辟（1917）', bc: false, year: 1917, month: 7, day: 5 }
];

const coverage = COVERAGE;
const isBC = ref(false);
const yearInput = ref<number | ''>(new Date().getFullYear());
const month = ref(new Date().getMonth() + 1);
const day = ref(new Date().getDate());
const copied = ref(false);

/** 输入是否有效 */
const validInput = computed(() => Number.isInteger(yearInput.value) && (yearInput.value as number) >= 1);

/** 当月的天数（公元前日期按格里历规则推算） */
const daysInMonth = computed(() => {
  if (!validInput.value) return 31;
  const astro = isBC.value ? 1 - (yearInput.value as number) : yearInput.value;
  const d = new Date();
  d.setDate(1);
  d.setFullYear(astro as number, month.value, 0);
  return d.getDate();
});

// 月份变化后修正日期，避免出现 2 月 30 日之类的非法组合
watch(daysInMonth, (max) => {
  if (day.value > max) day.value = max;
});

/** 查询结果 */
const result = computed(() =>
  validInput.value
    ? queryNianHao(isBC.value, yearInput.value as number, month.value, day.value)
    : { status: 'gap' as const, matches: [] }
);

/** 主结果 */
const primary = computed(() => result.value.matches[0]);

/** 上一个年号的起始日（以当前输入日期为基准沿时间轴向前找） */
const prevTarget = computed(() =>
  validInput.value ? findEraStart(isBC.value, yearInput.value as number, month.value, day.value, -1) : undefined
);

/** 下一个年号的起始日 */
const nextTarget = computed(() =>
  validInput.value ? findEraStart(isBC.value, yearInput.value as number, month.value, day.value, 1) : undefined
);

/** 跳转按钮的提示文本 */
function jumpText(t: EraJumpTarget): string {
  return `${t.dynasty} ${t.name}（${t.bc ? `公元前 ${t.year} 年` : `${t.year} 年`}）起始`;
}

/** 跳转到指定年号的起始日期 */
function jumpTo(t: EraJumpTarget) {
  isBC.value = t.bc;
  yearInput.value = t.year;
  month.value = t.month;
  day.value = t.day;
}

/** 输入日期的展示文本 */
const inputDateText = computed(() => {
  if (!validInput.value) return '';
  const y = isBC.value ? `公元前 ${yearInput.value} 年` : `${yearInput.value} 年`;
  return `${y}${month.value} 月 ${day.value} 日`;
});

/** 使用今天日期 */
function useToday() {
  const now = new Date();
  isBC.value = false;
  yearInput.value = now.getFullYear();
  month.value = now.getMonth() + 1;
  day.value = now.getDate();
}

/** 应用快捷示例 */
function applyPreset(p: Preset) {
  isBC.value = p.bc;
  yearInput.value = p.year;
  month.value = p.month;
  day.value = p.day;
}

/** 复制主结果 */
async function copyResult() {
  const m = primary.value;
  if (!m) return;
  const text = `${inputDateText.value}：${m.dynasty} ${m.emperor}，${m.eraText}`;
  await copyText(text);
  copied.value = true;
  popupToast('已复制到剪贴板', { type: 'success', duration: 1500, vertical: 'bottom' });
  setTimeout(() => (copied.value = false), 1500);
}
</script>
