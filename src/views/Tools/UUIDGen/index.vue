<!-- UUID生成页面路由组件 -->
<template>
  <div id="uuid" class="w-full flex flex-col gap-4 p-4 overflow-y-auto no-scrollbar">
    <h1 class="w-full text-center text-3xl mt-2">UUID生成</h1>
    <p class="text-sm opacity-70 text-center">批量生成UUID（v4/v1/v6/v7），支持大写、小写与不带连字符“-”等格式，点击任意结果即可复制。</p>

    <!-- 简介 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">简介</h2>
        <p class="text-sm opacity-80">UUID，全称为通用唯一识别码（Universally Unique Identifier），是一种标准化的标识符。它在计算机系统中广泛应用，用于唯一标识对象、实体或信息。UUID由128位数字组成，通常以32个十六进制数字的形式表示，中间使用连字符进行分隔。</p>
        <ul>
          <li class="indent-4 text-sm opacity-60 p-1">v1：时间戳 + 节点MAC地址 + 计数器，时间上有序，但高位设计问题导致数据库插入非完全连续，有泄露机器的 MAC 地址和生成时间的风险。早期分布式系统、需追踪生成来源的场景。</li>
          <li class="indent-4 text-sm opacity-60 p-1">v4（推荐）：纯随机数（122位随机比特），完全随机无序，没有无任何时间或硬件信息泄露的风险。通用默认选择、对排序无要求的随机ID。</li>
          <li class="indent-4 text-sm opacity-60 p-1">v6：将v1的时间戳高低位进行重排（时间戳前置），改善了v1的时序性，适合数据库顺序插入，仍包含 MAC 地址和生成时间。需要时间排序但基于v1逻辑改造的系统。</li>
          <li class="indent-4 text-sm opacity-60 p-1">v7：Unix毫秒时间戳 + 随机数，天然按时间递增，对数据库B+树索引极友好，不暴露机器MAC地址，仅有时间戳和随机数。现代数据库主键索引、分布式系统推荐首选。</li>
        </ul>
      </div>
    </div>

    <!-- 生成设置 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">生成设置</h2>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label class="join shrink-0">
            <button class="btn btn-sm join-item pointer-events-none">数量</button>
            <input
                type="number"
                class="input input-sm join-item w-24 font-mono"
                min="1"
                max="1000"
                v-model.number="count"
            />
          </label>

          <div class="shrink-0">
            <span class="opacity-60 mr-2">版本：</span>
            <div class="btn-group inline-block align-middle">
              <button
                  v-for="v in VERSIONS"
                  :key="v.value"
                  class="btn btn-sm"
                  :class="version === v.value ? 'btn-primary' : ''"
                  :title="v.desc"
                  @click="version = v.value"
              >{{ v.label }}</button>
            </div>
          </div>

          <div class="shrink-0">
            <span class="opacity-60 mr-2">格式：</span>
            <div class="inline-flex flex-wrap gap-1 align-middle">
              <label
                  v-for="f in FORMATS"
                  :key="f.value"
                  class="label cursor-pointer gap-1 rounded-lg border border-base-300 bg-base-100 px-2 py-1 hover:shadow transition-shadow"
                  :class="{ 'border-primary!': formats.includes(f.value) }"
                  :title="f.desc"
              >
                <input type="checkbox" class="checkbox checkbox-sm" :value="f.value" v-model="formats"/>
                <span class="label-text text-xs">{{ f.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button class="btn btn-primary btn-sm shrink-0" @click="generateAll">
            生成 {{ count }} 个 UUID
          </button>
          <button class="btn btn-sm shrink-0" @click="() => list = []">清空</button>
          <button class="btn btn-sm shrink-0" :disabled="!list.length" @click="copyAll">复制全部</button>
          <button class="btn btn-sm btn-ghost shrink-0"
                  :disabled="!list.length"
                  @click="() => clickDownload(
                      list.map(row => row.join('\t')).join('\n'),
                      'text/plain',
                      () => `uuid_${Date.now()}.txt`)"
          >下载 TXT</button>
          <span v-if="list.length" class="badge badge-outline font-mono shrink-0">共 {{ list.length }} 条</span>
        </div>
        <p v-if="!formats.length" class="text-error text-sm">请至少勾选一种输出格式。</p>
      </div>
    </div>

    <!-- 单条示例：各格式对比 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="card-title text-base">格式预览</h2>
          <button class="btn btn-sm ml-auto shrink-0" @click="refreshSample">换一条</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div
              v-for="item in sampleItems"
              :key="item.label"
              class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:shadow transition-shadow select-all"
              title="点击复制"
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

    <!-- 生成结果列表 -->
    <div class="card bg-base-200 shadow-sm grow">
      <div class="card-body gap-2">
        <h2 class="card-title text-base">生成结果</h2>
        <div v-if="!list.length" class="py-10 text-center opacity-50 text-sm">
          暂无数据，点击上方“生成”按钮开始。
        </div>
        <div v-else class="flex flex-col gap-1.5 overflow-y-auto pr-1">
          <div
              v-for="(row, idx) in list"
              :key="idx"
              class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:shadow transition-shadow"
              title="点击复制该行"
              @click="copy(row.join('\n'))"
          >
            <div class="flex flex-col min-w-0 gap-0.5">
              <span v-for="u in row" :key="u" class="font-mono text-sm break-all">{{ u }}</span>
            </div>
            <div class="shrink-0 opacity-60">
              <Copied v-if="copiedText === row.join('\n')" :size="16" :twClasses="['fill-success']"/>
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
import { onBeforeUnmount, ref } from 'vue';
import { copyText, popupTip, clickDownload } from '@/common/utils';
import * as uuid from 'uuid';

/** 生成数量 */
const count = ref(3);
/** 选择的版本 */
const version = ref<number>(4);
/** 勾选的输出格式 */
const formats = ref<FormatValue[]>(['lower-dash'/*, 'lower-no-dash', 'upper-dash', 'upper-no-dash'*/]);
/** 生成结果，每行一个数组（包含该行各格式文本） */
const list = ref<string[][]>([]);
/** 当前复制成功的文本（用于图标反馈） */
const copiedText = ref('');
/** 格式预览条目 */
const sampleItems = ref<{ label: string; value: string }[]>([]);

/** 支持的 UUID 版本 */
const VERSIONS = [
  { value: 4, label: 'v4', desc: '随机UUID（推荐）' },
  { value: 1, label: 'v1', desc: '时间戳 + 节点MAC地址 + 计数器' },
  { value: 6, label: 'v6', desc: '将v1的时间戳高低位进行重排（时间戳前置）' },
  { value: 7, label: 'v7', desc: 'Unix毫秒时间戳 + 随机数' },
] as const;

/** 输出格式选项 */
const FORMATS = [
  { value: 'lower-dash', label: '小写连字符', desc: '如：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
  { value: 'lower-no-dash', label: '小写无连字符', desc: '如：xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
  { value: 'upper-dash', label: '大写连字符', desc: '如：XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' },
  { value: 'upper-no-dash', label: '大写无连字符', desc: '如：XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
  { value: 'urn', label: 'URN前缀', desc: '如：urn:uuid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
] as const;

type FormatValue = (typeof FORMATS)[number]['value'];

/**
 * 将原始 UUID 按指定格式转为输出文本
 * @param raw {string} 小写带连字符的 UUID
 * @param f {FormatValue} 输出格式
 */
const toOutput = (raw: string, f: FormatValue): string => {
  switch (f) {
    case 'lower-dash':
      return raw;
    case 'lower-no-dash':
      return raw.replace(/-/g, '');
    case 'upper-dash':
      return raw.toUpperCase();
    case 'upper-no-dash':
      return raw.replace(/-/g, '').toUpperCase();
    case 'urn':
      return `urn:uuid:${raw}`;
    default:
      return raw;
  }
}

function genUUID(): string {
  switch (version.value) {
    case 1:
      return uuid.v1();
    case 4:
      return uuid.v4();
    case 6:
      return uuid.v6();
    case 7:
      return uuid.v7();
    default:
      return '';
  }
}

/** 刷新格式预览 */
function refreshSample() {
  const raw = genUUID();
  sampleItems.value = FORMATS.map(f => ({
    label: `${f.label}　${f.desc}`,
    value: toOutput(raw, f.value),
  }));
}

/** 批量生成 */
function generateAll() {
  if (!formats.value.length) {
    popupTip('请至少勾选一种输出格式', 'warning');
    return;
  }
  const n = Math.min(Math.max(Math.trunc(count.value) || 1, 1), 1000);
  count.value = n;
  const rows: string[][] = [];
  for (let i = 0; i < n; i++) {
    const raw = genUUID();
    rows.push(formats.value.map(f => toOutput(raw, f)));
  }
  list.value = rows;
}

/** 复制全部（逐行输出，行间换行、格式间制表符） */
async function copyAll() {
  const text = list.value.map(row => row.join('\t')).join('\n');
  await copy(text, true);
  popupTip(`已复制${list.value.length}条`, 'success', 1500);
}

/** 复制图标定时切换事件 */
let copyTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * 复制文本并显示反馈图标
 * @param text {string} 要复制的文本
 * @param dontTip {boolean} 是否不弹窗提示
 */
const copy = async (text: string, dontTip: boolean = false) => {
  await copyText(text);
  copiedText.value = text;
  !dontTip && popupTip(`已复制 ${text.length > 16 ? text.slice(0, 8) + '…' + text.slice(-6) : text}`, 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
};

// 初始化预览
refreshSample();
onBeforeUnmount(() => copyTimer && clearTimeout(copyTimer));
</script>
