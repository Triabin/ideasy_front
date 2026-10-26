<!-- 进制转换页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">进制转换</h1>
    <p class="text-sm opacity-70 text-center">在任意进制（2 ~ 36）之间转换整数，支持超大数值、前缀识别与按位分组显示。</p>

    <!-- 输入区 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <label class="join shrink-0">
            <button class="btn btn-sm join-item pointer-events-none">源进制</button>
            <select v-model.number="srcBase" class="select select-sm join-item w-32 font-mono">
              <option v-for="b in baseOptions" :key="b" :value="b">{{ b }} 进制{{ BASE_NAMES[b] ? `（${BASE_NAMES[b].split(' ')[0]}）` : '' }}</option>
            </select>
          </label>
          <label class="input grow items-center gap-2 min-w-60" :class="{ 'input-error': !!parseError }">
            <span class="opacity-60 shrink-0">数值</span>
            <input
                type="text"
                class="grow font-mono"
                v-model="inputText"
                placeholder="如：255 / 0xFF / 1111_1111 / -1010"
                spellcheck="false"
            />
          </label>
        </div>

        <!-- 快速选择 & 自定义进制 -->
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="opacity-60">快速选择：</span>
          <button
              v-for="b in [2, 8, 10, 16]"
              :key="b"
              class="btn btn-xs"
              :class="srcBase === b ? 'btn-primary' : ''"
              @click="srcBase = b"
          >{{ BASE_NAMES[b] }}</button>
          <span class="opacity-60 ml-2">其他进制（2~36）：</span>
          <input
              type="number"
              class="input input-sm w-20 font-mono"
              min="2"
              max="36"
              :value="srcBase"
              @change="onCustomBaseChange"
          />
        </div>
      </div>
    </div>

    <!-- 常用进制输出（点击复制） -->
    <div v-if="parsed !== null" class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <span class="font-mono break-all">{{ fmt.display }}</span>
          </div>
          <div class="shrink-0 flex items-center opacity-60">
            <Copied v-if="copiedText === fmt.value" :size="18" :twClasses="['fill-success']"/>
            <Copy v-else :size="18"/>
          </div>
        </div>
      </div>
    </div>

    <!-- 任意目标进制 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="card-title text-base">任意进制转换</h2>
          <label class="join ml-auto">
            <button class="btn btn-sm join-item pointer-events-none">目标进制</button>
            <select v-model.number="dstBase" class="select select-sm join-item w-32 font-mono">
              <option v-for="b in baseOptions" :key="b" :value="b">{{ b }} 进制{{ BASE_NAMES[b] ? `（${BASE_NAMES[b].split(' ')[0]}）` : '' }}</option>
            </select>
          </label>
        </div>
        <div
            v-if="dstResult"
            class="rounded-xl border border-base-300 bg-base-100 p-3 font-mono break-all text-lg select-all cursor-pointer"
            title="点击复制"
            @click="copy(dstResult)"
        >{{ dstResult }}</div>
        <div v-else class="opacity-40 font-mono text-sm">—</div>
      </div>
    </div>

    <!-- 位宽信息 & 二进制位视图 -->
    <div v-if="parsed !== null" class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">位信息</h2>
        <div class="flex flex-wrap gap-2 text-sm">
          <span class="badge badge-outline font-mono">位宽 {{ bitLen }} bits</span>
          <span class="badge badge-outline font-mono">约 {{ byteLen }} 字节</span>
          <span class="badge badge-outline font-mono">十进制位数 {{ decDigits }}</span>
          <span v-if="!isSafeInteger" class="badge badge-warning font-mono">超出 JS 安全整数范围（BigInt）</span>
        </div>
        <!-- 二进制按位展示（每 4 位一组），仅在位数不超过 256 时显示 -->
        <div v-if="bitLen > 0 && bitLen <= 256" class="overflow-x-auto">
          <div class="inline-flex flex-col gap-1 min-w-max">
            <div class="flex font-mono text-[10px] opacity-50">
              <span
                  v-for="(g, i) in bitGroups"
                  :key="'h' + i"
                  class="w-11 text-center border-base-300 first:border-l-0"
              >{{ (bitGroups.length - 1 - i) * 4 }}~{{ (bitGroups.length - 1 - i) * 4 + 3 }}</span>
            </div>
            <div class="flex font-mono text-sm">
              <span
                  v-for="(g, i) in bitGroups"
                  :key="'b' + i"
                  class="w-11 text-center border-base-300 first:border-l-0 py-1 rounded"
                  :class="g.includes('1') ? 'bg-primary/15' : ''"
              >{{ g }}</span>
            </div>
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
import {
  parseToBigInt,
  fromBigInt,
  groupDigits,
  bitLength,
  isValidBase,
  BASE_NAMES,
} from './baseConverter';
import {copyText, popupTip} from '@/common/utils.ts';

const inputText = ref<string>('255');
const srcBase = ref<number>(10);
const dstBase = ref<number>(16);
const parseError = ref<string>('');
const copiedText = ref<string>('');

/** 下拉可选的进制（2 ~ 36） */
const baseOptions = Array.from({ length: 35 }, (_, i) => i + 2);

/** 手动输入自定义进制 */
const onCustomBaseChange = (e: Event) => {
  const v = Number((e.target as HTMLInputElement).value);
  if (isValidBase(v)) {
    srcBase.value = v;
  } else {
    popupTip('进制仅支持 2 ~ 36 的整数', 'error', 2000);
  }
};

/* ------------------------- 解析 ------------------------- */

const abs = (v: bigint) => (v < 0n ? -v : v);

/** 解析结果（null 表示无效输入） */
const parsed = computed<bigint | null>(() => {
  const raw = inputText.value.trim();
  if (!raw) return null;
  try {
    const v = parseToBigInt(raw, srcBase.value);
    parseError.value = '';
    return v;
  } catch (e: any) {
    parseError.value = e?.message ?? '解析失败';
    return null;
  }
});

const isSafeInteger = computed(() => {
  const v = parsed.value;
  return v !== null && v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER);
});

const decDigits = computed(() => parsed.value !== null ? fromBigInt(abs(parsed.value), 10).length : 0);
const bitLen = computed(() => parsed.value !== null ? bitLength(parsed.value) : 0);
const byteLen = computed(() => Math.ceil(bitLen.value / 8));

/* ------------------------- 输出格式 ------------------------- */

const formats = computed(() => {
  const v = parsed.value;
  if (v === null) return [];
  const mk = (key: string, label: string, value: string, display?: string) => ({
    key, label, value, display: display ?? value,
  });
  const bin = fromBigInt(v, 2);
  const oct = fromBigInt(v, 8);
  const dec = fromBigInt(v, 10);
  const hex = fromBigInt(v, 16, false, true);
  return [
    mk('bin', '二进制（B）', `${bin}`, groupDigits(bin, 4)),
    mk('oct', '八进制（O）', `${oct}`),
    mk('hex', '十六进制（H）', `${hex}`, `0x${groupDigits(hex, 4)}`),
    mk('dec', '十进制（D）', dec, groupDigits(dec, 3)),
  ];
});

/** 任意目标进制结果 */
const dstResult = computed(() => {
  const v = parsed.value;
  if (v === null || !isValidBase(dstBase.value)) return '';
  return fromBigInt(v, dstBase.value, false, true);
});

/** 二进制按位分组（高位在前，补齐 4 位一组） */
const bitGroups = computed(() => {
  const v = parsed.value;
  if (v === null) return [];
  let bin = fromBigInt(abs(v), 2);
  const pad = (4 - (bin.length % 4)) % 4;
  bin = '0'.repeat(pad) + bin;
  const groups: string[] = [];
  for (let i = 0; i < bin.length; i += 4) groups.push(bin.slice(i, i + 4));
  return groups;
});

/* ------------------------- 交互 ------------------------- */

const truncate = (s: string) => (s.length > 16 ? s.slice(0, 8) + '…' + s.slice(-6) : s);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text) return;
  await copyText(text);
  copiedText.value = text;
  popupTip(`已复制 ${truncate(text)}`, 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
};

// 输入非法时给出提示
watch(parseError, (err) => {
  if (err && inputText.value.trim()) {
    popupTip(err, 'error', 2500);
  }
});
</script>
