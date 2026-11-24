<!-- 十二时辰工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">十二时辰</h1>
    <p class="text-sm opacity-70 text-center">古人将一昼夜分为十二时辰。实时显示当前时辰与初、正、刻，背景随日升月落的光照变化，并附各时辰的生肖由来与词语来源。</p>

    <!-- 实时天光 -->
    <div class="relative min-h-105 rounded-2xl overflow-hidden shadow-md select-none">
      <!-- 天空渐变 -->
      <div class="absolute inset-0" :style="{ background: sky.bgGradient }"></div>
      <!-- 地平线霞光 -->
      <div class="absolute rounded-full pointer-events-none" :style="glowStyle"></div>
      <!-- 星辰 -->
      <div class="absolute inset-0 pointer-events-none" :style="{ opacity: sky.starOpacity }">
        <span v-for="star in stars" :key="star.id" class="star" :style="starStyle(star)"></span>
      </div>
      <!-- 太阳 -->
      <div class="absolute rounded-full pointer-events-none" :style="sunStyle"></div>
      <!-- 月亮 -->
      <div class="absolute rounded-full pointer-events-none" :style="moonStyle"></div>
      <!-- 云层 -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none" :style="{ opacity: sky.cloudOpacity }">
        <span v-for="(cloud, i) in CLOUDS" :key="i" class="cloud" :style="cloudStyle(cloud)"></span>
      </div>
      <!-- 远山、近山与树影剪影 -->
      <svg class="absolute bottom-0 left-0 w-full pointer-events-none" viewBox="0 0 1200 240" preserveAspectRatio="none" style="height: 32%">
        <path :fill="sky.hillFar" d="M0,130 Q170,70 360,110 T720,100 T1050,125 T1200,95 L1200,240 L0,240 Z"/>
        <path :fill="sky.hillNear" d="M0,180 Q240,125 480,170 T880,160 T1200,185 L1200,240 L0,240 Z"/>
        <path :fill="sky.hillNear" d="M128,205 L146,120 L164,205 Z M176,205 L188,150 L200,205 Z M866,215 L890,105 L914,215 Z M930,215 L944,150 L958,215 Z"/>
      </svg>
      <!-- 信息层 -->
      <div class="relative z-content flex flex-col items-center justify-center gap-3 px-6 py-10 text-center text-white sky-text">
        <template v-if="previewIndex === null">
          <div class="text-sm opacity-90">{{ dateText }}</div>
          <div class="flex items-end gap-4">
            <span class="text-8xl leading-none font-serif">{{ state.item.zhi }}</span>
            <div class="flex flex-col items-start gap-1.5 pb-1.5">
              <span class="text-3xl font-semibold">{{ state.item.name }} · {{ state.item.alias }}</span>
              <div class="flex flex-wrap items-center justify-center gap-2 text-xs">
                <span class="sky-badge">生肖{{ state.item.animal }}</span>
                <span class="sky-badge font-mono">{{ state.item.range }}</span>
                <span class="sky-badge">第 {{ state.ke }} 刻 / 共 8 刻</span>
              </div>
            </div>
          </div>
          <div class="font-mono text-5xl tracking-wider">{{ clockText }}</div>
          <div class="text-sm">当前<b class="mx-1">{{ state.phaseLabel }}</b>（{{ state.phaseRange }}） · {{ remainText }}</div>
          <div class="w-full max-w-md flex flex-col gap-1">
            <div class="h-1.5 rounded-full bg-white/25 overflow-hidden">
              <div class="h-full rounded-full bg-white/90" :style="{ width: (state.progress * 100).toFixed(2) + '%' }"></div>
            </div>
            <div class="flex justify-between text-[11px] opacity-80">
              <span>本时辰已过 {{ pct(state.progress) }}</span>
              <span>全天已过 {{ pct(state.dayProgress) }}（自子时起）</span>
            </div>
          </div>
          <button class="btn btn-sm btn-ghost text-white border-white/40 hover:bg-white/20 gap-1" title="点击复制当前时辰信息" @click="copyNow">
            <Copied v-if="copied" :size="16" :twClasses="['fill-white']"/>
            <Copy v-else :size="16" :twClasses="['fill-white']"/>
            复制当前时辰
          </button>
        </template>
        <template v-else>
          <div class="sky-badge text-xs">预览 {{ viewItem.name }} 天光（示意时刻 {{ pad2(viewHours) }}:00）</div>
          <div class="flex items-end gap-4">
            <span class="text-8xl leading-none font-serif">{{ viewItem.zhi }}</span>
            <div class="flex flex-col items-start gap-1.5 pb-1.5">
              <span class="text-3xl font-semibold">{{ viewItem.name }} · {{ viewItem.alias }}</span>
              <div class="flex flex-wrap items-center justify-center gap-2 text-xs">
                <span class="sky-badge">生肖{{ viewItem.animal }}</span>
                <span class="sky-badge font-mono">{{ viewItem.range }}</span>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm font-mono">
            <span>{{ viewItem.chu }}</span>
            <span>{{ viewItem.zheng }}</span>
          </div>
          <p class="max-w-xl text-sm opacity-90 leading-6">{{ viewItem.brief }}</p>
          <button class="btn btn-sm text-white border-white/50 bg-white/10 hover:bg-white/25" @click="backToNow">返回当前时辰</button>
        </template>
      </div>
    </div>
    <p class="text-xs opacity-60 text-center -mt-2">
      每个时辰合两小时：前一小时为「初」、后一小时为「正」；一时辰又分八刻，一刻约十五分钟。详见页末说明。
    </p>

    <!-- 昼夜时辰总览 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="card-title text-base">昼夜时辰总览</h2>
          <span class="text-xs opacity-60">自子时（23:00）起排；色带为该时辰中点的天光，点击任意时辰可在上方预览</span>
        </div>
        <div class="relative">
          <div class="flex h-16 rounded-lg overflow-hidden">
            <button
                v-for="(item, i) in SHICHEN"
                :key="item.zhi"
                class="relative grow flex flex-col items-center justify-center gap-0.5 text-white sky-text cursor-pointer hover:brightness-125 transition-[filter]"
                :class="{ 'outline-2 -outline-offset-2 outline-white': i === viewIndex }"
                :style="{ background: STRIPS[i] }"
                :title="`${item.name}（${item.alias}）${item.range}，点击预览`"
                @click="togglePreview(i)"
            >
              <span class="absolute rounded-full pointer-events-none" :style="miniBodyStyle(i)"></span>
              <span class="text-xl leading-none font-serif">{{ item.zhi }}</span>
              <span class="text-[10px] leading-none opacity-90">{{ item.alias }}</span>
            </button>
          </div>
          <!-- 当前时刻标线 -->
          <div
              v-if="previewIndex === null"
              class="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none z-content"
              :style="{ left: (state.dayProgress * 100).toFixed(3) + '%' }"
          ></div>
        </div>
        <div class="flex text-[10px] font-mono opacity-60">
          <span v-for="item in SHICHEN" :key="item.zhi" class="grow text-center">{{ pad2(item.startHour) }}</span>
        </div>
      </div>
    </div>

    <!-- 相关知识 -->
    <details class="collapse collapse-arrow bg-base-100 border border-base-300">
      <summary class="collapse-title font-semibold">关于十二时辰、初正与更刻</summary>
      <div class="collapse-content text-sm text-base-content/75 leading-6 indent-8">
        <p>古人观测太阳的运行，把一昼夜分为十二个时辰，用十二地支子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥来标记，每个时辰合今天两个小时。先秦典籍中还有「夜半」「鸡鸣」「平旦」「日出」等按天象与作息命名的叫法，与十二地支时辰一一对应。</p>
        <p>每个时辰又分「初」「正」：前一个小时称「某初」，后一个小时称「某正」，于是一天实际是二十四个「小时」。子正恰好是今天的 0 点，午正恰好是 12 点，所以正午又叫「中午」；明末清初西方二十四小时制传入后，一个时辰被拆成两个「小时」，这便是「小时」一词的由来。</p>
        <p>夜间另按五更计：戌时为一更、亥时为二更、子时为三更、丑时为四更、寅时为五更，「三更半夜」「五更天亮」即由此而来。每个时辰还分八刻，一刻约十五分钟，旧时问斩选在「午时三刻」，约在上午十一时半至四十五分之间，取阳气最盛之意。</p>
        <p>十二时辰与十二生肖相配，一种通行的说法是按各动物最活跃的时段：夜半鼠出（子）、鸡鸣牛反刍（丑）、平旦虎行（寅）、日出兔出窝（卯），依此类推。</p>
      </div>
    </details>

    <!-- 时辰对照卡片 -->
    <h2 class="text-xl font-semibold mt-2">时辰对照</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      <div
          v-for="(item, i) in SHICHEN"
          :key="item.zhi"
          class="card bg-base-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          :class="{ 'ring-2 ring-primary': i === state.index }"
          :title="`点击在上方预览${item.name}天光`"
          @click="togglePreview(i)"
      >
        <figure class="relative h-24 shrink-0" :style="{ background: STRIPS[i] }">
          <span class="absolute rounded-full pointer-events-none" :style="miniBodyStyle(i)"></span>
          <span v-if="i === state.index" class="badge badge-primary absolute top-2 left-2 z-content">当前</span>
          <span v-else-if="i === previewIndex" class="badge badge-secondary absolute top-2 left-2 z-content">预览中</span>
          <span
              class="absolute top-2 right-2 w-8 h-8 rounded-md flex items-center justify-center text-white text-lg font-serif shadow z-content"
              :style="{ background: item.accent }"
              :title="`生肖：${item.animal}`"
          >{{ item.animal }}</span>
          <div class="absolute inset-0 flex items-center px-4 text-white sky-text">
            <span class="text-5xl font-serif font-bold">{{ item.zhi }}</span>
          </div>
          <div class="absolute right-4 bottom-2 flex flex-col items-end gap-0.5 text-right text-white sky-text">
            <span class="text-base font-medium">{{ item.name }} · {{ item.alias }}</span>
            <span class="text-xs font-mono opacity-90">{{ item.range }}</span>
          </div>
        </figure>
        <div class="card-body p-4 gap-2">
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono opacity-70">
            <span>{{ item.chu }}</span>
            <span>{{ item.zheng }}</span>
          </div>
          <p class="text-sm leading-6 opacity-80">{{ item.brief }}</p>
          <div class="rounded-lg bg-base-100 border border-base-300 px-3 py-2">
            <div class="flex items-center gap-2">
              <span class="badge badge-sm badge-outline shrink-0">词语来源</span>
              <b class="text-sm">{{ item.word.term }}</b>
            </div>
            <p class="text-xs leading-5 opacity-75 mt-1">{{ item.word.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, type CSSProperties } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { copyText, popupToast } from '@/common/utils.ts';
import {
  SHICHEN,
  STRIPS,
  computeSky,
  getShiChenState,
  makeStars,
  midBody,
  midHourOf,
  type SkyState,
  type Star,
} from './shichen';

/* ------------------------- 云层参数 ------------------------- */
const CLOUDS = [
  { top: '16%', w: 240, h: 36, dur: 95, delay: -8, o: 0.5 },
  { top: '30%', w: 170, h: 26, dur: 130, delay: -70, o: 0.38 },
  { top: '10%', w: 300, h: 44, dur: 160, delay: -120, o: 0.3 },
] as const;

/** 星空（固定种子，位置不随渲染变化） */
const stars = makeStars();

/* ------------------------- 实时状态 ------------------------- */
const now = ref<Date>(new Date());
const timer = setInterval(() => (now.value = new Date()), 1000);
onBeforeUnmount(() => clearInterval(timer));

const state = computed(() => getShiChenState(now.value));

/** 预览的时辰索引，null 表示跟随当前时间 */
const previewIndex = ref<number | null>(null);
const viewIndex = computed(() => previewIndex.value ?? state.value.index);
const viewItem = computed(() => SHICHEN[viewIndex.value]);
/** 天空渲染所用的浮点小时：实时或预览时辰的中点 */
const viewHours = computed(() => previewIndex.value === null ? state.value.hoursFloat : midHourOf(viewIndex.value));
const sky = computed<SkyState>(() => computeSky(viewHours.value));

const togglePreview = (i: number) => previewIndex.value = previewIndex.value === i ? null : i;
const backToNow = () => previewIndex.value = null;

/* ------------------------- 文本 ------------------------- */
const pad2 = (n: number) => String(Math.floor(((n % 24) + 24) % 24)).padStart(2, '0');
const pct = (v: number) => `${Math.round(v * 100)}%`;
const clockText = computed(() => now.value.format('HH:mm:ss'));
const dateText = computed(() => now.value.format('yyyy-MM-dd EE'));
const remainText = computed(() => {
  const totalMin = Math.max(1, Math.ceil((1 - state.value.progress) * 120));
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  const next = SHICHEN[(state.value.index + 1) % 12];
  return `距${next.name}约${hh ? `${hh} 小时 ` : ''}${mm} 分钟`;
});

/* ------------------------- 复制 ------------------------- */
const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copyNow = async () => {
  const s = state.value;
  const text = `${dateText.value} ${clockText.value} ${s.item.name}（${s.item.alias}）${s.item.range} ${s.phaseLabel}（${s.phaseRange}）第${s.ke}刻`;
  await copyText(text);
  copied.value = true;
  popupToast('已复制当前时辰信息', { type: 'success', duration: 1500 });
  copyTimer && clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copied.value = false), 1500);
};

/* ------------------------- 天空元素样式 ------------------------- */
const sunStyle = computed<CSSProperties>(() => ({
  left: `${sky.value.sunX}%`,
  top: `${sky.value.sunY}%`,
  width: '64px',
  height: '64px',
  transform: 'translate(-50%, -50%)',
  opacity: sky.value.sunOpacity,
  background: 'radial-gradient(circle, #FFFBE8 0%, #FFE08A 42%, #FFB44D 78%, #FF9C33 100%)',
  boxShadow: '0 0 60px 22px rgba(255, 190, 90, 0.5)',
}));

const moonStyle = computed<CSSProperties>(() => ({
  left: `${sky.value.moonX}%`,
  top: `${sky.value.moonY}%`,
  width: '52px',
  height: '52px',
  transform: 'translate(-50%, -50%)',
  opacity: sky.value.moonOpacity,
  background: 'radial-gradient(circle at 38% 34%, #FFFFFF 0%, #F2F4FF 55%, #CBD2EA 100%)',
  boxShadow: '0 0 44px 14px rgba(216, 226, 255, 0.35)',
}));

const glowStyle = computed<CSSProperties>(() => ({
  left: `${sky.value.sunX}%`,
  top: `${sky.value.sunY}%`,
  width: '460px',
  height: '460px',
  transform: 'translate(-50%, -50%)',
  opacity: sky.value.glowOpacity,
  background: 'radial-gradient(circle, rgba(255,158,88,0.55) 0%, rgba(255,158,88,0.18) 45%, rgba(255,158,88,0) 70%)',
}));

const starStyle = (star: Star): CSSProperties => ({
  left: `${star.x}%`,
  top: `${star.y}%`,
  width: `${star.r * 2}px`,
  height: `${star.r * 2}px`,
  animationDuration: `${star.dur}s`,
  animationDelay: `${star.delay}s`,
  '--o': `${star.o}`,
} as CSSProperties);

const cloudStyle = (cloud: (typeof CLOUDS)[number]): CSSProperties => ({
  top: cloud.top,
  width: `${cloud.w}px`,
  height: `${cloud.h}px`,
  opacity: cloud.o,
  animationDuration: `${cloud.dur}s`,
  animationDelay: `${cloud.delay}s`,
});

/** 时辰色带上的日月小圆点 */
const miniBodyStyle = (i: number): CSSProperties => {
  const body = midBody(i);
  return {
    left: `${body.x}%`,
    top: `${body.y}%`,
    width: '10px',
    height: '10px',
    transform: 'translate(-50%, -50%)',
    background: body.isSun ? '#FFE9A8' : '#EEF1FF',
    boxShadow: `0 0 8px 2px ${body.isSun ? 'rgba(255,220,140,0.65)' : 'rgba(230,236,255,0.5)'}`,
  };
};
</script>

<style lang="css" scoped>
.sky-text {
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.sky-badge {
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.16);
  padding: 0.25rem 0.75rem;
  backdrop-filter: blur(4px);
}

.star {
  position: absolute;
  border-radius: 9999px;
  background: #fff;
  animation-name: twinkle;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
}

@keyframes twinkle {
  0%, 100% {
    opacity: var(--o, 0.8);
  }
  50% {
    opacity: calc(var(--o, 0.8) * 0.15);
  }
}

.cloud {
  position: absolute;
  left: -320px;
  border-radius: 9999px;
  background: #fff;
  filter: blur(12px);
  animation-name: drift;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes drift {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(100vw + 640px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .star,
  .cloud {
    animation: none;
  }
}
</style>
