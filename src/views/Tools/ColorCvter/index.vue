<!-- 颜色转换 -->
<template>
  <div class="h-full max-h-full w-full flex flex-col gap-4 p-4 overflow-y-auto thin-scrollbar">
    <h1 class="w-full text-center text-3xl mt-2">颜色转换</h1>
    <p class="text-sm opacity-70 text-center">输入 HEX / RGB / HSL / HSV / CMYK 任意格式，自动转换为其他格式并预览效果。</p>

    <!-- 当前颜色大预览块 -->
    <div
        class="w-full rounded-2xl min-h-28 flex items-center justify-center transition-colors shadow-inner checkerboard"
        :style="{ 'background-color': cssColor }"
    >
      <span
          class="px-3 py-1 rounded-full text-lg font-mono select-all"
          :style="{ color: textColor, backgroundColor: overlayColor }"
      >{{ hexUpper }}</span>
    </div>

    <!-- 输入区 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <input
              type="color"
              class="w-12 h-12 rounded cursor-pointer border-none bg-transparent p-0"
              :value="hexUpper"
              title="系统取色器"
              @input="onPickerInput"
          />
          <label class="input grow items-center gap-2 min-w-60" :class="{ 'input-error': !!parseError }">
            <span class="opacity-60 shrink-0">颜色值</span>
            <input
                type="text"
                class="grow font-mono"
                v-model="inputText"
                placeholder="#FF5733 / rgb(255,87,51) / hsl(11,100%,60%) / hsv() / cmyk()"
                @keyup.enter="applyInput"
            />
            <button class="btn btn-sm btn-ghost shrink-0" title="应用输入" @click="applyInput">转换</button>
          </label>
        </div>

        <!-- 常用色板 -->
        <div class="flex flex-wrap gap-2">
          <button
              v-for="c in presets"
              :key="c"
              class="w-8 h-8 rounded-lg border border-base-300 cursor-pointer hover:scale-110 transition-transform checkerboard"
              :style="{ 'background-color': c }"
              :title="c"
              @click="setInput(c)"
          ></button>
        </div>
      </div>
    </div>

    <!-- 各格式输出（点击复制） -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
          v-for="fmt in formats"
          :key="fmt.key"
          class="card bg-base-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          title="点击复制"
          @click="copy(fmt.value)"
      >
        <div class="card-body py-3 px-4 flex-row items-center justify-between gap-2">
          <div class="flex flex-col min-w-0">
            <i class="text-xs opacity-60">{{ fmt.label }}</i>
            <span class="font-mono truncate">{{ fmt.value }}</span>
          </div>
          <div class="shrink-0 flex items-center opacity-60">
            <Copied v-if="copiedText === fmt.value" :size="18" :twClasses="['fill-success']"/>
            <Copy v-else :size="18"/>
          </div>
        </div>
      </div>
    </div>

    <!-- 明度调节与色阶 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="card-title text-base">色阶生成</h2>
          <div class="join ml-auto">
            <button class="btn btn-sm join-item" @click="shiftLightness(-10)">变暗</button>
            <button class="btn btn-sm join-item" @click="shiftLightness(10)">变亮</button>
          </div>
        </div>
        <div class="grid grid-cols-9 gap-1">
          <button
              v-for="(c, i) in scaleColors"
              :key="i"
              class="h-14 rounded-lg cursor-pointer hover:scale-105 transition-transform flex flex-col items-center justify-end pb-1 checkerboard"
              :style="{ 'background-color': c.css }"
              @click="copy(c.hex)"
          >
            <span class="text-[10px] font-mono px-1 rounded" :style="{ color: c.textColor, backgroundColor: c.overlay }">{{ c.hex }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 对比度检查 & 文字预览 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">对比度检查（WCAG）</h2>
        <div class="flex flex-wrap gap-3">
          <div
              v-for="bg in contrastBgs"
              :key="bg.name"
              class="flex-1 min-w-40 rounded-xl p-3 border border-base-300 flex flex-col gap-1 items-center"
              :style="{ backgroundColor: bg.color }"
          >
            <span class="text-sm" :style="{ color: cssColor }">Aa 示例文字 Sample</span>
            <span class="text-xs font-mono opacity-90" :style="{ color: cssColor }">{{ bg.name }} {{ currentContrast.bg[bg.key].ratio }}:1 · {{ currentContrast.bg[bg.key].level }}</span>
          </div>
        </div>
        <div class="rounded-xl p-4 border border-base-300" style="background-color: #FFFFFF">
          <textarea
              v-model="previewText"
              rows="2"
              class="textarea textarea-bordered w-full"
              :style="{ color: cssColor }"
              placeholder="在此预览该颜色作为文字色的实际效果"
          >{{ previewText }}</textarea>
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div v-if="cvtColorHistories.length" class="card bg-base-200 shadow-sm">
      <div class="card-body py-3 gap-2">
        <div class="flex items-center justify-between">
          <h2 class="card-title text-sm">最近使用</h2>
          <button class="btn btn-xs btn-ghost" @click="clearCvtColorHistory">清空</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
              v-for="(h, i) in cvtColorHistories"
              :key="i"
              class="badge badge-lg gap-1 badge-outline font-mono cursor-pointer hover:bg-base-300"
              @click="setInput(h)"
          >
            <span class="w-3 h-3 rounded-full inline-block checkerboard" :style="{ 'background-color': h }"></span>
            {{ h }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRef } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import {
  adjustLightness,
  ColorParseError,
  formatCmyk,
  formatCss,
  formatHex,
  formatHslCss,
  formatHsv,
  hslToRgb,
  parseColor,
  relativeLuminance,
  type Rgba,
  rgbToHsl,
} from './colorConverter';
import { copyText, popupTip } from '@/common/utils.ts';
import useAppDataStore from '@/stores/appData';

const inputText = ref<string>('#FF5733');
const parseError = ref<string>('');
const copiedText = ref<string>('');
const previewText = ref<string>('The quick brown fox jumps over the lazy dog. 永字八法');

/** 当前解析出的 RGBA 颜色 */
const color = ref<Rgba>({ r: 255, g: 87, b: 51, a: 1 });

const presets = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#EC4899',
  '#000000', '#6B7280', '#FFFFFF',
];

/* ------------------------- 派生数据 ------------------------- */

const hexUpper = computed(() => formatHex(color.value));
const cssColor = computed(() => formatCss(color.value));

/** 根据亮度自动选择黑/白前景，用于在色块上展示文字 */
const isLight = computed(() => relativeLuminance(color.value) > 0.4);
const textColor = computed(() => (isLight.value ? '#000' : '#FFF'));
const overlayColor = computed(() => (isLight.value ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.35)'));

const formats = computed(() => {
  const c = color.value;
  return [
    { key: 'hex', label: 'HEX', value: formatHex(c) },
    { key: 'hexLower', label: 'HEX（小写）', value: formatHex(c, false) },
    { key: 'rgb', label: 'RGB / RGBA', value: formatCss(c) },
    { key: 'hsl', label: 'HSL / HSLA', value: formatHslCss(c) },
    { key: 'hsv', label: 'HSV / HSB', value: formatHsv(c) },
    { key: 'cmyk', label: 'CMYK', value: formatCmyk(c) },
  ];
});

/** 色阶：以当前颜色为基准，保持色相与饱和度，明度从 95% 均匀过渡到 15%（浅→深） */
const scaleColors = computed(() => {
  const { h, s } = rgbToHsl(color.value.r, color.value.g, color.value.b);
  const steps = 9;
  return Array.from({ length: steps }, (_, i) => {
    const l = 95 - (i * 80) / (steps - 1);
    const c: Rgba = { ...hslToRgb(h, s, l), a: color.value.a };
    const light = relativeLuminance(c) > 0.4;
    return {
      hex: formatHex(c),
      css: formatCss(c),
      textColor: light ? '#000' : '#FFF',
      overlay: light ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.35)',
    };
  });
});

/* ------------------------- 对比度 ------------------------- */

type ContrastBgKey = 'white' | 'black' | 'gray';
const contrastBgs: { name: string, key: ContrastBgKey, color: string }[] = [
  { name: '白底', key: 'white', color: '#FFFFFF' },
  { name: '黑底', key: 'black', color: '#000000' },
  { name: '浅灰底', key: 'gray', color: '#F3F4F6' },
];

/** 计算当前颜色在三种背景上的 WCAG 对比度 */
const currentContrast = computed(() => {
  const c = color.value;
  const calc = (bg: Rgba) => {
    const l1 = Math.max(relativeLuminance(c), relativeLuminance(bg));
    const l2 = Math.min(relativeLuminance(c), relativeLuminance(bg));
    const ratio = Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
    let level: 'AAA' | 'AA' | 'AA Large' | 'Fail' = 'Fail';
    if (ratio >= 7) level = 'AAA';
    else if (ratio >= 4.5) level = 'AA';
    else if (ratio >= 3) level = 'AA Large';
    return { ratio, level };
  };
  return {
    bg: {
      white: calc({ r: 255, g: 255, b: 255, a: 1 }),
      black: calc({ r: 0, g: 0, b: 0, a: 1 }),
      gray: calc({ r: 243, g: 244, b: 246, a: 1 }),
    },
  };
});

/* ------------------------- 交互 ------------------------- */

/** 历史颜色（本地存储） */
const cvtColorHistories = toRef(useAppDataStore(), 'cvtColorHistories');
const { pushCvtColorHistory, clearCvtColorHistory } = useAppDataStore();

/**
 * 应用输入框内容：解析成功则更新颜色并记入历史
 */
const applyInput = () => {
  try {
    color.value = parseColor(inputText.value);
    parseError.value = '';
    inputText.value = formatHex(color.value);
    pushCvtColorHistory(formatHex(color.value));
    popupTip('解析成功', 'success', 1500);
  } catch (e: any) {
    parseError.value = e?.message ?? '解析失败';
    popupTip(e instanceof ColorParseError ? e.message : '无法识别的颜色格式', 'error', 2500);
  }
};

/** 从色板/历史选择颜色 */
const setInput = (value: string) => {
  inputText.value = value;
  applyInput();
};

/** 系统取色器（不支持 alpha） */
const onPickerInput = (e: Event) => {
  inputText.value = (e.target as HTMLInputElement).value;
  applyInput();
};

/** 明度增减 */
const shiftLightness = (delta: number) => {
  color.value = adjustLightness(color.value, delta);
  inputText.value = formatHex(color.value);
  pushCvtColorHistory(formatHex(color.value));
};

/** 复制到剪贴板 */
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  await copyText(text);
  copiedText.value = text;
  popupTip(`已复制 ${text}`, 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
};
</script>

<style scoped>
/* 透明色棋盘格底纹，便于观察 alpha 通道 */
.checkerboard {
  background-image:
      linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
      linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
      linear-gradient(-45deg, transparent 75%, #cbd5e1 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}
</style>
