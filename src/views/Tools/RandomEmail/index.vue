<!-- 随机邮箱生成页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto no-scrollbar">
    <h1 class="w-full text-center text-3xl mt-2">随机邮箱</h1>
    <p class="text-sm opacity-70 text-center">批量随机生成邮箱地址，支持三种用户名风格与常见/自定义域名，点击任意结果即可复制。</p>

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
            <span class="opacity-60 mr-2">用户名风格：</span>
            <div class="join inline-flex align-middle">
              <button v-for="s in STYLES" :key="s.value" class="btn btn-sm join-item"
                      :class="{ 'btn-primary': style === s.value }" :title="s.desc"
                      @click="style = s.value"
              >{{ s.label }}</button>
            </div>
          </div>

          <div class="shrink-0">
            <span class="opacity-60 mr-2">域名：</span>
            <div class="join inline-flex align-middle">
              <button class="btn btn-sm join-item" :class="{ 'btn-primary': domainMode === 'common' }"
                      :title="`在 ${DOMAINS.length} 个常见邮箱域名中随机：${DOMAINS.slice(0, 6).join('、')} 等`"
                      @click="domainMode = 'common'"
              >常见域名随机</button>
              <button class="btn btn-sm join-item" :class="{ 'btn-primary': domainMode === 'custom' }"
                      @click="domainMode = 'custom'"
              >自定义域名</button>
            </div>
          </div>

          <input v-if="domainMode === 'custom'"
                 v-model="customDomain"
                 type="text"
                 class="input input-sm input-bordered w-48 font-mono shrink-0"
                 placeholder="example.com"
                 spellcheck="false"
          />

          <label class="label cursor-pointer gap-2 shrink-0" title="在用户名后追加随机数字（如年份或 2-3 位数）">
            <input type="checkbox" class="toggle toggle-sm toggle-primary" v-model="withDigits"/>
            <span>数字后缀</span>
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button class="btn btn-primary btn-sm shrink-0" @click="generate">生成 {{ clampedCount }} 个邮箱</button>
          <button class="btn btn-sm shrink-0" :disabled="!list.length" @click="list = []">清空</button>
          <button class="btn btn-sm shrink-0" :disabled="!list.length" @click="copyAll">复制全部</button>
          <button class="btn btn-sm btn-ghost shrink-0" :disabled="!list.length"
                  @click="clickDownload(list.map(i => i.email).join('\n'), 'text/plain', () => `emails_${Date.now()}.txt`)"
          >下载 TXT</button>
          <span v-if="list.length" class="badge badge-outline font-mono shrink-0">共 {{ list.length }} 条</span>
        </div>
        <p v-if="domainMode === 'custom' && customDomain && !isValidDomain(customDomain)" class="text-error text-sm">
          自定义域名格式不正确（示例：example.com、mail.company.cn）
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
          <div v-for="(item, idx) in list" :key="item.email + idx"
               class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:shadow transition-shadow"
               :title="`点击复制 ${item.email}`"
               @click="copy(item.email)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-mono text-sm break-all">{{ item.email }}</span>
              <span class="badge badge-xs badge-ghost font-mono shrink-0">@{{ item.domain }}</span>
            </div>
            <div class="shrink-0 opacity-60">
              <Copied v-if="copiedText === item.email" :size="16" :twClasses="['fill-success']"/>
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
import { DOMAINS, isValidDomain, randomEmail, type DomainMode, type EmailStyle, type GenEmail } from './emailGen';

/** 单次最多生成数量 */
const MAX_COUNT = 200;

const STYLES = [
  { value: 'word', label: '单词组合', desc: '英文形容词 + 名词，如 brave.fox、lucky_panda1996' },
  { value: 'syllable', label: '拼音音节', desc: '2-3 个拼音音节拼接，近似中文名拼音，如 linxi、wangyuran24' },
  { value: 'letters', label: '随机字母', desc: '5-9 位随机小写字母，可附数字，如 xkqjm8842' },
] as const;

const count = ref<number>(10);
const style = ref<EmailStyle>('word');
const withDigits = ref<boolean>(false);
const domainMode = ref<DomainMode>('common');
const customDomain = ref<string>('');
const list = ref<GenEmail[]>([]);
const copiedText = ref<string>('');

const clampedCount = computed(() => Math.min(Math.max(Math.trunc(count.value) || 1, 1), MAX_COUNT));

/** 生成一批不重复邮箱 */
function generate() {
  if (domainMode.value === 'custom' && !isValidDomain(customDomain.value)) {
    popupToast('请先填写格式正确的自定义域名', { type: 'warning', duration: 2000 });
    return;
  }
  const n = clampedCount.value;
  const seen = new Set<string>();
  const out: GenEmail[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 50) {
    const item = randomEmail(style.value, withDigits.value, domainMode.value, customDomain.value);
    if (seen.has(item.email)) continue;
    seen.add(item.email);
    out.push(item);
  }
  list.value = out;
  if (out.length < n) {
    popupToast(`仅生成 ${out.length} 个不重复邮箱，可尝试更换风格或开启数字后缀`, { type: 'warning', duration: 2500 });
  }
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
    await copyText(list.value.map(i => i.email).join('\n'));
    popupToast(`已复制全部 ${list.value.length} 个邮箱`, { type: 'success', duration: 1500 });
  } catch (e: any) {
    popupToast(e?.message ?? '复制失败', { type: 'error', duration: 2500 });
  }
};

onBeforeUnmount(() => copyTimer && clearTimeout(copyTimer));
</script>
