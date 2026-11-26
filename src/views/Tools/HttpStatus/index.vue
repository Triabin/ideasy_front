<!-- HTTP 状态码速查工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">HTTP 状态码速查</h1>
    <p class="text-sm opacity-70 text-center">
      涵盖 IANA 注册的全量 1xx～5xx 标准状态码（共 {{ stdCount }} 个），并收录 nginx、Cloudflare 等常见扩展码 {{ extCount }} 个。
      支持按状态码、英文名、中文含义与 RFC 出处搜索，输入「4xx」可直达分类。
    </p>

    <!-- 分类速览卡片（点击筛选） -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <button
          v-for="c in CATS" :key="c.key"
          class="card bg-base-200 shadow-sm border-2 transition-colors text-left"
          :class="cat === c.key ? [c.activeBorder, 'bg-base-300/40'] : 'border-transparent hover:border-base-300'"
          :title="cat === c.key ? '点击取消筛选' : `只看 ${c.key.toUpperCase()} ${c.zh}`"
          @click="cat = cat === c.key ? '' : c.key"
      >
        <div class="card-body p-3 gap-1.5">
          <div class="flex items-center gap-2">
            <span class="badge badge-sm font-mono font-bold" :class="c.badge">{{ c.key.toUpperCase() }}</span>
            <span class="text-sm font-semibold">{{ c.zh }}</span>
            <span class="ml-auto text-xs opacity-50 tabular-nums">{{ catCounts[c.key] }}</span>
          </div>
          <p class="text-xs opacity-60 leading-relaxed">{{ c.summary }}</p>
        </div>
      </button>
    </div>

    <!-- 搜索与筛选工具栏 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body py-3 flex-row flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label class="input input-sm input-bordered flex items-center gap-2 flex-1 min-w-48 bg-base-100">
          <Search class="shrink-0"/>
          <input
              v-model="keyword"
              type="search"
              class="grow"
              placeholder="搜索：404 / not found / 缓存 / nginx / RFC 9110 / 4xx"
              spellcheck="false"
          />
        </label>
        <div class="flex items-center gap-1 shrink-0">
          <button class="btn btn-sm" :class="{ 'btn-primary': onlyCommon }" @click="onlyCommon = !onlyCommon"
                  title="只显示日常开发中最常见的状态码">仅常见</button>
          <button class="btn btn-sm" :class="{ 'btn-primary': onlyStd }" @click="onlyStd = !onlyStd"
                  title="隐藏 nginx、Cloudflare、Laravel 等非标准扩展码">仅标准码</button>
          <button v-if="hasFilter" class="btn btn-sm btn-ghost" @click="resetFilter">重置</button>
        </div>
        <span class="ml-auto text-xs opacity-60 shrink-0 tabular-nums">匹配 {{ filtered.length }} / {{ ITEMS.length }} 个</span>
      </div>
    </div>

    <!-- 状态码列表（按分类分组） -->
    <div v-for="g in groups" :key="g.key" class="card bg-base-200 shadow-sm">
      <div class="card-body p-3 gap-1">
        <!-- 分组头 -->
        <div class="flex items-center gap-2 px-1 pb-1">
          <span class="badge badge-sm font-mono font-bold" :class="g.badge">{{ g.key.toUpperCase() }}</span>
          <span class="font-semibold text-sm">{{ g.zh }} · {{ g.en }}</span>
          <span class="text-xs opacity-50 tabular-nums">{{ g.items.length }} 个</span>
        </div>

        <!-- 状态码行 -->
        <div
            v-for="item in g.items" :key="item.code"
            :id="`sc-${item.code}`"
            class="rounded-box transition-colors"
            :class="{ 'bg-base-200 ring-2 ring-primary/60': highlightCode === item.code }"
        >
          <div
              class="flex items-center gap-2 sm:gap-3 px-2 py-2 rounded-box cursor-pointer select-none hover:bg-base-100/70"
              role="button"
              tabindex="0"
              :title="expanded.has(item.code) ? '点击收起详情' : '点击查看含义与出处'"
              @click="toggleExpand(item.code)"
              @keydown.enter.prevent="toggleExpand(item.code)"
              @keydown.space.prevent="toggleExpand(item.code)"
          >
            <span class="badge font-mono font-bold w-13 justify-center shrink-0" :class="g.badge">{{ item.code }}</span>
            <div class="flex flex-col min-w-0 flex-1">
              <div class="flex items-baseline gap-2 flex-wrap">
                <span class="font-semibold truncate">{{ item.en }}</span>
                <span v-if="item.alt" class="text-xs opacity-45 font-mono truncate">原名 {{ item.alt }}</span>
              </div>
              <span class="text-xs opacity-60 truncate">{{ item.zh }}</span>
            </div>
            <div class="hidden sm:flex items-center gap-1 shrink-0">
              <span v-if="item.common" class="badge badge-xs badge-soft badge-success border-transparent">常见</span>
              <span v-if="item.std === false" class="badge badge-xs badge-soft badge-neutral border-transparent">非标准</span>
              <span v-if="item.tag" class="badge badge-xs badge-ghost">{{ item.tag }}</span>
            </div>
            <span class="text-xs opacity-40 w-4 text-center shrink-0">{{ expanded.has(item.code) ? '▾' : '▸' }}</span>
          </div>

          <!-- 展开详情 -->
          <div v-if="expanded.has(item.code)" class="px-2 pb-3 sm:pl-18 flex flex-col gap-1.5">
            <p class="text-sm opacity-80 leading-relaxed">{{ item.desc }}</p>
            <div class="flex items-center gap-2 text-xs">
              <span class="badge badge-xs badge-ghost sm:hidden" v-if="item.common">常见</span>
              <span class="badge badge-xs badge-ghost sm:hidden" v-if="item.std === false">非标准</span>
              <span class="badge badge-xs badge-ghost sm:hidden" v-if="item.tag">{{ item.tag }}</span>
              <span class="opacity-50">出处：{{ item.src }}</span>
              <CopyBtn
                  class="ml-auto"
                  :value="`${item.code} ${item.en}`"
                  label="复制"
                  :title="`复制 ${item.code} ${item.en}`"
                  popup-toast="on"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空态 -->
    <div v-if="!groups.length" class="text-center opacity-40 py-10 text-sm flex flex-col items-center gap-2">
      <span>没有匹配「{{ keyword }}」的状态码。</span>
      <button v-if="hasFilter" class="btn btn-sm btn-ghost" @click="resetFilter">清空筛选条件</button>
      <span v-else class="text-xs">支持搜索状态码数字、英文名、中文名、描述关键词或 RFC 编号。</span>
    </div>

    <!-- 数据来源说明 -->
    <p class="text-center text-xs opacity-40 pb-2">
      数据依据 IANA「HTTP Status Codes」注册表整理，主要出处：RFC 9110（HTTP 语义）、RFC 6585（附加状态码）、RFC 4918（WebDAV）等。
    </p>
  </div>
</template>
<script lang="ts" setup>
import CopyBtn from '@/components/CopyBtn';
import Search from '@/components/icons/Search.vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { CATS, ITEMS, STATUS_MAP, catOf, type CatKey } from './statusData';

const route = useRoute();

/** 搜索关键词 */
const keyword = ref<string>('');
/** 分类筛选（空串为全部） */
const cat = ref<CatKey | ''>('');
/** 只看常见状态码 */
const onlyCommon = ref<boolean>(false);
/** 只看 IANA 标准码（隐藏 nginx/Cloudflare 等扩展码） */
const onlyStd = ref<boolean>(false);
/** 展开详情的状态码集合 */
const expanded = ref<Set<number>>(new Set());
/** 深链定位高亮的状态码 */
const highlightCode = ref<number>(0);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

const stdCount = ITEMS.filter(it => it.std !== false).length;
const extCount = ITEMS.length - stdCount;
const catCounts: Record<string, number> = Object.fromEntries(
    CATS.map(c => [c.key, ITEMS.filter(it => catOf(it.code) === c.key).length])
);

const hasFilter = computed(() => !!cat.value || onlyCommon.value || onlyStd.value || keyword.value.trim() !== '');
const resetFilter = () => {
  keyword.value = '';
  cat.value = '';
  onlyCommon.value = false;
  onlyStd.value = false;
};

/** 按关键词 + 分类 + 开关过滤后的状态码列表 */
const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  // 输入「Nxx」时直接按分类筛选
  const catMatch = q ? /^([1-5])xx$/.exec(q) : null;
  const tokens = q && !catMatch ? q.split(/\s+/) : [];
  return ITEMS.filter(it => {
    if (cat.value && catOf(it.code) !== cat.value) return false;
    if (onlyCommon.value && !it.common) return false;
    if (onlyStd.value && it.std === false) return false;
    if (catMatch) return catOf(it.code) === `${catMatch[1]}xx`;
    if (!tokens.length) return true;
    const text = [it.code, it.en, it.alt ?? '', it.zh, it.desc, it.src, it.tag ?? ''].join(' ').toLowerCase();
    return tokens.every(t => text.includes(t));
  });
});

/** 过滤结果按分类分组（空组不渲染） */
const groups = computed(() => CATS
    .map(c => ({ ...c, items: filtered.value.filter(it => catOf(it.code) === c.key) }))
    .filter(g => g.items.length > 0));

const toggleExpand = (code: number) => {
  expanded.value.has(code) ? expanded.value.delete(code) : expanded.value.add(code);
};

/** 支持 ?code=404 深链：进入页面后展开对应条目并滚动定位 */
onMounted(async () => {
  const code = Number(route.query.code);
  if (!code || !STATUS_MAP[code]) return;
  expanded.value.add(code);
  highlightCode.value = code;
  await nextTick();
  document.getElementById(`sc-${code}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  highlightTimer = setTimeout(() => (highlightCode.value = 0), 2500);
});
onBeforeUnmount(() => highlightTimer && clearTimeout(highlightTimer));
</script>
