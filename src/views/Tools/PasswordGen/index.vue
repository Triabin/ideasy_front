<!-- 密码/PIN生成页面路由组件 -->
<template>
  <div id="password-gen" class="h-full max-h-full w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">密码生成</h1>
    <p class="text-sm opacity-70 text-center">
      可配置字符类型（小写字母/大写字母/数字/特殊字符）、长度与数量，支持PIN码模式（仅数字，长度3~12位），最近100条生成记录本地保存。
    </p>

    <!-- 生成设置 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <h2 class="card-title text-base mr-auto">生成设置</h2>
          <!-- 模式切换 -->
          <div class="btn-group inline-block align-middle shrink-0">
            <button
                class="btn btn-sm"
                :class="mode === 'password' ? 'btn-primary' : ''"
                @click="mode = 'password'"
            >密码</button>
            <button
                class="btn btn-sm"
                :class="mode === 'pin' ? 'btn-primary' : ''"
                @click="mode = 'pin'"
                title="PIN码仅包含数字，长度3~12位"
            >PIN码</button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label class="join shrink-0">
            <button class="btn btn-sm join-item pointer-events-none">{{ mode === 'pin' ? '位数' : '长度' }}</button>
            <input
                type="number"
                class="input input-sm join-item w-24 font-mono"
                :min="lengthRange.min"
                :max="lengthRange.max"
                v-model.number="length"
            />
          </label>

          <label class="join shrink-0">
            <button class="btn btn-sm join-item pointer-events-none">数量</button>
            <input
                type="number"
                class="input input-sm join-item w-24 font-mono"
                min="1"
                max="100"
                v-model.number="count"
            />
          </label>

          <!-- 字符类型选项（PIN模式下隐藏，仅数字） -->
          <div v-if="mode === 'password'" class="shrink-0">
            <span class="opacity-60 mr-2">字符类型：</span>
            <div class="inline-flex flex-wrap gap-1 align-middle">
              <template v-for="c in CHAR_CLASSES" :key="c.value">
                <label
                    class="label cursor-pointer gap-1 rounded-lg border border-base-300 bg-base-100 px-2 py-1 hover:shadow transition-shadow"
                    :class="{ 'border-primary!': charSets.includes(c.value) }"
                    :title="c.value === 'special' ? `常用在前，可在旁边输入框中编辑本次参与生成的特殊字符` : c.desc"
                >
                  <input type="checkbox" class="checkbox checkbox-sm" :value="c.value" v-model="charSets"/>
                  <span class="label-text text-xs">{{ c.label }}</span>
                </label>
                <!-- 特殊字符勾选时，出现可编辑的本次参与生成的特殊字符输入框 -->
                <input
                    v-if="c.value === 'special' && charSets.includes('special')"
                    type="text"
                    class="input input-sm w-48 font-mono"
                    title="本次加入密码生成的特殊字符，可编辑；清空则使用默认全量集合"
                    placeholder="_ * - …"
                    v-model="specialCharsInput"
                    maxlength="64"
                />
              </template>
            </div>
          </div>
          <p v-else class="text-sm opacity-60 shrink-0">PIN码内容只包含数字（0-9）。</p>
        </div>

        <!-- 排除字符选项 -->
        <div v-if="mode !== 'pin'" class="flex flex-wrap items-center gap-3 text-sm">
          <label class="label cursor-pointer gap-2 shrink-0" title="勾选后可输入需要从字符池中剔除的字符">
            <input type="checkbox" class="checkbox checkbox-sm" v-model="excludeEnabled"/>
            <span class="label-text">排除字符</span>
          </label>
          <input
              type="text"
              class="input input-sm w-64 font-mono"
              :class="{ 'opacity-50 cursor-not-allowed': !excludeEnabled }"
              placeholder="勾选后可输入，如：0OlI1|`"
              v-model="excludeChars"
              :disabled="!excludeEnabled"
              maxlength="64"
          />
          <span v-if="excludeError" class="text-error text-xs">{{ excludeError }}</span>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button class="btn btn-primary btn-sm shrink-0" :disabled="!canGenerate" @click="generateAll">
            生成 {{ count }} 个{{ mode === 'pin' ? ' PIN码' : '密码' }}
          </button>
          <button class="btn btn-sm shrink-0" @click="list = []">清空结果</button>
          <button class="btn btn-sm shrink-0" :disabled="!list.length" @click="copyAll">复制全部</button>
          <button
              class="btn btn-sm btn-ghost shrink-0"
              :disabled="!list.length"
              title="将当前结果存入最近记录"
              @click="saveToHistory()"
          >存入记录</button>
          <span v-if="list.length" class="badge badge-outline font-mono shrink-0">共 {{ list.length }} 条</span>
        </div>
        <p v-if="mode === 'password' && !charSets.length" class="text-error text-sm">请至少勾选一种字符类型。</p>
        <p v-else-if="specialError" class="text-error text-sm">{{ specialError }}</p>
      </div>
    </div>

    <!-- 强度预览 -->
    <div v-if="mode === 'password'" class="card bg-base-200 shadow-sm">
      <div class="card-body gap-2">
        <h2 class="card-title text-base">强度参考</h2>
        <div class="flex flex-wrap items-center gap-3 text-sm">
          <span class="opacity-60 shrink-0">字符池大小：</span>
          <span class="font-mono">{{ poolSize }}</span>
          <span class="opacity-60 shrink-0 ml-4">熵值：</span>
          <span class="font-mono">{{ entropy.toFixed(1) }} bit</span>
          <progress
              class="progress w-full max-w-xs"
              :class="strengthClass"
              :value="Math.min(entropy, 128)"
              max="128"
          ></progress>
          <span class="shrink-0 font-semibold" :class="strengthTextClass">{{ strengthText }}</span>
        </div>
        <p class="text-xs opacity-50">熵值 = log2(字符池大小) × 长度，仅供参考；≥60bit 一般认为足够安全。</p>
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
              v-for="(pwd, idx) in list"
              :key="idx"
              class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:shadow transition-shadow"
              title="点击复制"
              @click="copy(pwd)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-xs opacity-50 shrink-0">#{{ idx + 1 }}</span>
              <span class="font-mono text-base break-all tracking-wider">{{ pwd }}</span>
            </div>
            <div class="shrink-0 opacity-60">
              <Copied v-if="copiedText === pwd" :size="16" :twClasses="['fill-success']"/>
              <Copy v-else :size="16"/>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近记录 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-2">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="card-title text-base">最近记录（最多 {{ MAX_RECORDS }} 条）</h2>
          <span class="badge badge-outline font-mono">{{ records.length }}</span>
          <button
              class="btn btn-sm btn-error/80 ml-auto shrink-0"
              :disabled="!records.length"
              @click="clearHistory"
          >清除记录</button>
        </div>
        <div v-if="!records.length" class="py-6 text-center opacity-50 text-sm">
          暂无历史记录。生成的结果会自动保存到本地（localStorage）。
        </div>
        <div v-else class="flex flex-col gap-1.5 overflow-y-auto max-h-80 pr-1">
          <div
              v-for="(rec, idx) in records"
              :key="rec.time + '-' + idx"
              class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex flex-col gap-1"
          >
            <div class="flex items-center gap-2 text-xs opacity-60">
              <span class="font-mono">{{ formatTime(rec.time) }}</span>
              <span class="badge badge-sm badge-ghost outline-none">{{ rec.isPin ? `PIN ${rec.length}位` : `密码 ${rec.length}位` }}</span>
              <span class="badge badge-sm badge-ghost outline-none">{{ rec.count }} 条</span>
              <span v-if="!rec.isPin" class="hidden sm:inline">{{ describeCharSets(rec.options) }}</span>
              <div class="ml-auto flex items-center gap-1">
                <button class="btn btn-xs btn-ghost" title="复制该记录全部结果" @click="copy(rec.values.join('\n'))">
                  <Copy :size="14"/>
                </button>
                <button class="btn btn-xs btn-ghost text-error" title="删除该记录" @click="appDataStore.removePasswordGenRecord(idx)">
                  ✕
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                  v-for="(v, vi) in rec.values"
                  :key="vi"
                  class="font-mono text-sm rounded bg-base-200 px-2 py-0.5 cursor-pointer hover:shadow select-all"
                  title="点击复制"
                  @click="copy(v)"
              >{{ v }}</span>
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { copyText, popupTip } from '@/common/utils';
import useAppDataStore, { type PasswordGenRecord } from '@/stores/appData';

/** 最近记录最大保存条数 */
const MAX_RECORDS = 100;
/** 密码长度范围 */
const PWD_LEN_RANGE = { min: 1, max: 128, def: 16 };
/** PIN长度范围（需求：3~12，默认6） */
const PIN_LEN_RANGE = { min: 3, max: 12, def: 6 };

/** 各类字符集 */
const CHARSET_MAP = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digit: '0123456789',
  /** 默认特殊字符集：常用符号（_ - * 等）排在前面，勾选特殊字符时作为输入框初始值 */
  special: '_-*+@#&=!?.~/%^()[]{},:;<>$`"\'\\|',
} as const;

/** 特殊字符集默认值（同时作为输入框的初始内容） */
const DEFAULT_SPECIAL_CHARS = CHARSET_MAP.special;

/** 字符类型选项定义 */
const CHAR_CLASSES = [
  { value: 'lower', label: '小写字母', desc: 'a-z' },
  { value: 'upper', label: '大写字母', desc: 'A-Z' },
  { value: 'digit', label: '数字', desc: '0-9' },
  { value: 'special', label: '特殊字符', desc: `常用在前：${CHARSET_MAP.special.slice(0, 10)}…，可编辑` },
] as const;

type CharSetValue = (typeof CHAR_CLASSES)[number]['value'];

const appDataStore = useAppDataStore();

/** 生成模式：密码 / PIN码 */
const mode = ref<'password' | 'pin'>('password');
/** 长度/位数 */
const length = ref<number>(PWD_LEN_RANGE.def);
/** 生成数量 */
const count = ref<number>(1);
/** 勾选的字符类型 */
const charSets = ref<CharSetValue[]>(['lower', 'upper', 'digit'/*, 'special'*/]);
/** 特殊字符输入框内容（本次加入密码生成的特殊字符，可编辑；勾选特殊字符时生效） */
const specialCharsInput = ref<string>(DEFAULT_SPECIAL_CHARS);
/** 是否启用排除字符 */
const excludeEnabled = ref<boolean>(false);
/** 需要排除的字符 */
const excludeChars = ref<string>('');
/** 本次生成结果 */
const list = ref<string[]>([]);
/** 当前复制成功的文本（用于图标反馈） */
const copiedText = ref('');
/** 历史记录（来自持久化store） */
const records = computed<PasswordGenRecord[]>(() => appDataStore.passwordGenRecords);

/** 当前长度限制范围 */
const lengthRange = computed(() => mode.value === 'pin' ? PIN_LEN_RANGE : PWD_LEN_RANGE);

/** 去重后的本次特殊字符集合（输入框为空时回退为默认全量集合） */
const activeSpecialChars = computed(() => {
  const input = [...new Set(specialCharsInput.value)].join('');
  return input || DEFAULT_SPECIAL_CHARS;
});

/** 各字符类型对应的实际字符集（特殊字符取用户编辑后的集合） */
const effectiveCharsets = computed<Record<string, string>>(() => ({
  ...CHARSET_MAP,
  special: activeSpecialChars.value,
}));

/** 勾选特殊字符但输入的全是空白等导致无有效字符时的提示 */
const specialError = computed(() => {
  if (mode.value !== 'password' || !charSets.value.includes('special')) return '';
  if (![...activeSpecialChars.value].some(c => !/\s/.test(c))) {
    return '特殊字符不能全部为空白字符';
  }
  return '';
});

/** 密码模式下用户上次使用的长度（切回密码模式时恢复） */
let lastPwdLength = PWD_LEN_RANGE.def;

/** 切换模式时修正长度：PIN默认6位；切回密码恢复用户上次的密码长度（默认16） */
watch(mode, m => {
  if (m === 'pin') {
    length.value = PIN_LEN_RANGE.def;
  } else {
    length.value = Math.min(Math.max(lastPwdLength, PWD_LEN_RANGE.min), PWD_LEN_RANGE.max);
  }
});

/** 记录密码模式下的长度，供切回密码模式时恢复 */
watch([mode, length], ([m, l]) => {
  if (m === 'password') lastPwdLength = l;
});

/** 去重后的排除字符集合（仅在启用排除时生效） */
const excludedSet = computed(() => {
  if (!excludeEnabled.value) return '';
  return [...new Set(excludeChars.value)].join('');
});

/** 排除字符配置错误提示 */
const excludeError = computed(() => {
  if (!excludeEnabled.value || !excludedSet.value) return '';
  if (activePool.value) return '';
  return `排除后已无可生成字符（剩余${poolSize.value}种），请减少排除字符或增加勾选类型`;
});

/** 当前使用的字符池（应用排除字符后） */
const activePool = computed(() => {
  const raw = mode.value === 'pin'
      ? CHARSET_MAP.digit
      : charSets.value.map(k => effectiveCharsets.value[k]).join('');
  if (!excludeEnabled.value || !excludedSet.value) return raw;
  const ex = new Set(excludedSet.value);
  return [...raw].filter(c => !ex.has(c)).join('');
});

/** 字符池大小 */
const poolSize = computed(() => activePool.value.length);

/** 是否可生成 */
const canGenerate = computed(() => poolSize.value > 0 && !specialError.value);

/** 熵值（bit） */
const entropy = computed(() => poolSize.value ? Math.log2(poolSize.value) * length.value : 0);

/** 强度样式 */
const strengthClass = computed(() =>
    entropy.value >= 80 ? 'progress-success' :
        entropy.value >= 60 ? 'progress-info' :
            entropy.value >= 40 ? 'progress-warning' :
                'progress-error');
const strengthTextClass = computed(() =>
    entropy.value >= 80 ? 'text-success' :
        entropy.value >= 60 ? 'text-info' :
            entropy.value >= 40 ? 'text-warning' :
                'text-error');
const strengthText = computed(() =>
    entropy.value >= 80 ? '很强' :
        entropy.value >= 60 ? '较强' :
            entropy.value >= 40 ? '一般' :
                '较弱');

/**
 * 使用加密安全随机数从池中取一个字符
 * @param pool {string} 字符池
 */
function randomChar(pool: string): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return pool[arr[0] % pool.length];
}

/** 各勾选字符类排除后的子池（用于保证每类至少出现一次） */
function classPools(): string[] {
  if (mode.value === 'pin') return [];
  const ex = excludeEnabled.value ? new Set(excludedSet.value) : null;
  return charSets.value
      .map(k => {
        const set = effectiveCharsets.value[k];
        return ex ? [...set].filter(c => !ex.has(c)).join('') : set;
      })
      .filter(p => p.length > 0);
}

/**
 * 生成单个密码/PIN
 * 保证勾选且未被完全排除的每种字符类型至少出现一次（长度足够时），PIN模式仅数字
 */
function generateOne(): string {
  const len = length.value;
  const chars: string[] = [];
  const pools = classPools();
  // 先放入各类字符池各一个（若长度允许）
  if (mode.value === 'password' && pools.length <= len) {
    for (const p of pools) chars.push(randomChar(p));
  }
  while (chars.length < len) chars.push(randomChar(activePool.value));
  // Fisher-Yates洗牌，打乱必选字符的位置
  const rand = new Uint32Array(chars.length);
  crypto.getRandomValues(rand);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** 批量生成并自动存入最近记录 */
function generateAll() {
  if (mode.value === 'password' && !charSets.value.length) {
    popupTip('请至少勾选一种字符类型', 'warning');
    return;
  }
  if (specialError.value) {
    popupTip(specialError.value, 'warning');
    return;
  }
  if (!canGenerate.value) {
    popupTip('排除后已无可生成字符', 'warning');
    return;
  }
  const r = lengthRange.value;
  length.value = Math.min(Math.max(Math.trunc(length.value) || r.def, r.min), r.max);
  count.value = Math.min(Math.max(Math.trunc(count.value) || 1, 1), 100);
  const values: string[] = [];
  for (let i = 0; i < count.value; i++) values.push(generateOne());
  list.value = values;
  saveToHistory(values);
}

/**
 * 将结果存入最近记录（超出100条自动淘汰最旧）
 * @param values {string[]} 要保存的结果，默认当前结果
 */
function saveToHistory(values: string[] = list.value) {
  if (!values.length) return;
  appDataStore.pushPasswordGenRecord({
    values,
    length: length.value,
    count: values.length,
    isPin: mode.value === 'pin',
    options: {
      lower: charSets.value.includes('lower'),
      upper: charSets.value.includes('upper'),
      digit: charSets.value.includes('digit'),
      special: charSets.value.includes('special'),
      specialChars: charSets.value.includes('special') ? activeSpecialChars.value : '',
      excludeChars: excludeEnabled.value ? excludedSet.value : '',
    },
  });
}

/** 清除历史记录 */
function clearHistory() {
  appDataStore.clearPasswordGenHistory();
  popupTip('已清除全部密码生成记录', 'success', 1500);
}

/** 复制全部结果 */
async function copyAll() {
  await copy(list.value.join('\n'));
  popupTip(`已复制${list.value.length}条`, 'success', 1500);
}

/**
 * 描述记录中的字符集选项
 * @param options {PasswordGenRecord['options']} 字符集快照
 */
function describeCharSets(options: PasswordGenRecord['options']): string {
  const names = Object.entries(options).filter(([k, v]) => k !== 'excludeChars' && k !== 'specialChars' && v).map(([k]) =>
      CHAR_CLASSES.find(c => c.value === k)?.label ?? k);
  if (options.special) names.push(`特殊字符[${options.specialChars || DEFAULT_SPECIAL_CHARS}]`);
  if (options.excludeChars) names.push(`排除${options.excludeChars}`);
  return names.join('/') || '无';
}

/**
 * 格式化时间戳
 * @param t {number} 毫秒时间戳
 */
function formatTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 复制图标定时切换事件 */
let copyTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * 复制文本并显示反馈图标
 * @param text {string} 要复制的文本
 */
const copy = async (text: string) => {
  await copyText(text);
  copiedText.value = text;
  popupTip(`已复制 ${text.length > 16 ? text.slice(0, 8) + '…' + text.slice(-6) : text}`, 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
};

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
});
</script>
