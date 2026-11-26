<!-- 随机手机号生成页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto no-scrollbar">
    <h1 class="w-full text-center text-3xl mt-2">随机手机号</h1>
    <p class="text-sm opacity-70 text-center">按运营商真实号段前缀批量随机生成 11 位大陆手机号，点击任意结果即可复制（复制的始终是纯数字号码）。</p>

    <!-- 生成设置 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">生成设置</h2>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label class="join shrink-0">
            <button class="btn btn-sm join-item pointer-events-none">数量</button>
            <input type="number" class="input input-sm join-item w-24 font-mono" min="1" :max="MAX_COUNT" v-model.number="count"/>
          </label>

          <div class="shrink-0">
            <span class="opacity-60 mr-2">运营商：</span>
            <div class="join inline-flex align-middle">
              <button class="btn btn-sm join-item" :class="{ 'btn-primary': carrier === 'any' }"
                      @click="carrier = 'any'"
              >随机</button>
              <button v-for="c in CARRIERS" :key="c" class="btn btn-sm join-item"
                      :class="{ 'btn-primary': carrier === c }"
                      :title="`号段：${PREFIXES[c].join('、')}`"
                      @click="carrier = c"
              >{{ CARRIER_LABELS[c].replace('中国', '') }}</button>
            </div>
          </div>

          <div class="shrink-0">
            <span class="opacity-60 mr-2">显示格式：</span>
            <div class="join inline-flex align-middle">
              <button v-for="f in FORMATS" :key="f.value" class="btn btn-sm join-item"
                      :class="{ 'btn-primary': format === f.value }" :title="`示例：${f.example}`"
                      @click="format = f.value"
              >{{ f.label }}</button>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button class="btn btn-primary btn-sm shrink-0" @click="generate">生成 {{ clampedCount }} 个号码</button>
          <button class="btn btn-sm shrink-0" :disabled="!list.length" @click="list = []">清空</button>
          <button class="btn btn-sm shrink-0" :disabled="!list.length" @click="copyAll">复制全部</button>
          <button class="btn btn-sm btn-ghost shrink-0" :disabled="!list.length"
                  @click="clickDownload(list.map(i => i.raw).join('\n'), 'text/plain', () => `phones_${Date.now()}.txt`)"
          >下载 TXT</button>
          <span v-if="list.length" class="badge badge-outline font-mono shrink-0">共 {{ list.length }} 条</span>
        </div>
        <p class="text-xs opacity-40">
          号段前缀参考公开资料整理，可能滞后于实际放号；号码纯属随机生成，仅用于测试数据填充，请勿用于骚扰等非法用途。
        </p>
      </div>
    </div>

    <!-- 生成结果 -->
    <div class="card bg-base-200 shadow-sm grow">
      <div class="card-body gap-2">
        <h2 class="card-title text-base">生成结果</h2>
        <div v-if="!list.length" class="py-10 text-center opacity-50 text-sm">
          暂无数据，点击上方“生成”按钮开始。
        </div>
        <div v-else class="flex flex-col gap-1.5 overflow-y-auto pr-1">
          <div v-for="(item, idx) in list" :key="item.raw"
               class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:shadow transition-shadow"
               :title="`点击复制 ${item.raw}`"
               @click="copy(item.raw)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-mono text-sm tabular-nums">{{ formatPhone(item.raw, format) }}</span>
              <span class="badge badge-xs border-transparent" :class="CARRIER_BADGES[item.carrier]">{{ CARRIER_LABELS[item.carrier] }}</span>
              <span class="badge badge-xs badge-ghost font-mono hidden sm:inline-flex">{{ item.prefix }} 号段</span>
            </div>
            <div class="shrink-0 opacity-60">
              <Copied v-if="copiedText === item.raw" :size="16" :twClasses="['fill-success']"/>
              <Copy v-else :size="16"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { computed, onBeforeUnmount, ref } from 'vue';
import { copyText, popupToast, clickDownload } from '@/common/utils';
import {
  CARRIER_BADGES,
  CARRIER_LABELS,
  PREFIXES,
  formatPhone,
  randomPhone,
  type Carrier,
  type GenPhone,
  type PhoneFormat,
} from './phoneData';

/** 单次最多生成数量 */
const MAX_COUNT = 200;

const CARRIERS: Carrier[] = ['mobile', 'unicom', 'telecom', 'virtual'];
const FORMATS = [
  { value: 'plain', label: '连续', example: '13812345678' },
  { value: 'spaced', label: '空格分隔', example: '138 1234 5678' },
  { value: 'masked', label: '隐藏中间', example: '138****5678' },
] as const;

const count = ref<number>(10);
const carrier = ref<Carrier | 'any'>('any');
const format = ref<PhoneFormat>('plain');
const list = ref<GenPhone[]>([]);
const copiedText = ref<string>('');

const clampedCount = computed(() => Math.min(Math.max(Math.trunc(count.value) || 1, 1), MAX_COUNT));

/** 生成一批不重复号码 */
function generate() {
  const n = clampedCount.value;
  const seen = new Set<string>();
  const out: GenPhone[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 50) {
    const item = randomPhone(carrier.value);
    if (seen.has(item.raw)) continue;
    seen.add(item.raw);
    out.push(item);
  }
  list.value = out;
}

let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text) return;
  try {
    await copyText(text);
    copiedText.value = text;
    popupToast(`已复制 ${text}`, { type: 'success', duration: 1200 });
  } catch (e: any) {
    popupToast(e?.message ?? '复制失败', { type: 'error', duration: 2500 });
  }
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1200);
};

const copyAll = async () => {
  if (!list.value.length) return;
  try {
    await copyText(list.value.map(i => i.raw).join('\n'));
    popupToast(`已复制全部 ${list.value.length} 个号码`, { type: 'success', duration: 1500 });
  } catch (e: any) {
    popupToast(e?.message ?? '复制失败', { type: 'error', duration: 2500 });
  }
};

onBeforeUnmount(() => copyTimer && clearTimeout(copyTimer));
</script>
