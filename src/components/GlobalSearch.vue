<!-- 全局搜索：导航栏只做触发器，搜索逻辑全部在弹窗中 -->
<template>
  <!-- 导航栏触发框（伪输入框） -->
  <button
      type="button"
      class="flex items-center gap-2 h-9 w-40 px-3 rounded-md border border-base-300 bg-base-100 text-sm
      text-base-content/60 cursor-pointer hover:border-primary/60 hover:text-base-content transition-colors"
      :title="`搜索（${modifierKey} + K）`"
      @click="openSearch"
  >
    <Search class="shrink-0"/>
    <span class="grow text-left truncate">你找啥？</span>
    <span class="hidden md:flex items-center gap-0.5 shrink-0">
      <kbd class="kbd kbd-xs">{{ modifierKey }}</kbd>
      <kbd class="kbd kbd-xs">K</kbd>
    </span>
  </button>

  <!-- 搜索弹窗 -->
  <dialog ref="dialogRef" class="modal" aria-label="全局搜索">
    <div class="modal-box p-0 w-[calc(100%-2rem)] max-w-2xl overflow-hidden">
      <!-- 搜索输入框（真正的搜索入口） -->
      <div class="flex items-center gap-3 px-4 h-14 border-b border-base-200">
        <Search class="shrink-0"/>
        <input
            ref="inputRef"
            v-model="query"
            type="text"
            class="grow bg-transparent outline-none text-base placeholder:text-base-content/40"
            placeholder="搜索工具、说明或标签…"
            autocomplete="off"
            spellcheck="false"
            aria-label="搜索关键词"
            @keydown="onInputKeydown"
        />
        <kbd class="kbd kbd-sm shrink-0">esc</kbd>
      </div>

      <!-- 搜索结果 -->
      <ul ref="listRef" class="list-none m-0 p-2 max-h-[60vh] overflow-y-auto">
        <li
            v-for="(item, index) in results"
            :key="item.path"
            data-result
            class="flex flex-col gap-0.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
            :class="index === activeIndex ? 'bg-primary/15' : 'hover:bg-base-200'"
            @mouseenter="activeIndex = index"
            @click="go(item)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <component :is="item.icon" v-if="item.icon" :size="18" class="shrink-0"/>
            <span class="font-medium truncate">
              <template v-for="(seg, si) in item.titleSegments" :key="si">
                <span :class="seg.match ? 'text-primary' : ''">{{ seg.text }}</span>
              </template>
            </span>
            <span v-if="item.tags.length" class="hidden sm:flex items-center gap-1 ml-auto shrink-0">
              <span v-for="tag in item.tags.slice(0, 2)" :key="tag" class="badge badge-xs badge-ghost">{{ tag }}</span>
            </span>
          </div>
          <p v-if="item.desc" class="text-xs truncate opacity-60">
            <template v-for="(seg, si) in item.descSegments" :key="si">
              <span :class="seg.match ? 'text-primary font-medium' : ''">{{ seg.text }}</span>
            </template>
          </p>
        </li>
        <li v-if="results.length === 0" class="px-3 py-10 text-center text-sm opacity-60">
          没有找到与“{{ query.trim() }}”匹配的内容
        </li>
      </ul>

      <!-- 操作提示 -->
      <div class="flex items-center gap-4 px-4 py-2.5 border-t border-base-200 text-xs opacity-60">
        <span class="flex items-center gap-1">
          <kbd class="kbd kbd-xs">↑</kbd><kbd class="kbd kbd-xs">↓</kbd> 选择
        </span>
        <span class="flex items-center gap-1"><kbd class="kbd kbd-xs">↵</kbd> 打开</span>
        <span class="ml-auto">{{ results.length }} 个结果</span>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>关闭弹窗</button>
    </form>
  </dialog>
</template>

<script lang="ts" setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  toRef,
  useTemplateRef,
  watch,
  type Component,
} from 'vue';
import { useRouter, type RouteRecordRaw } from 'vue-router';
import Search from '@/components/icons/Search.vue';
import useSettingsStore from '@/stores/settingsStore';
import { flattenRoute, routes } from '@/router';

/** 可搜索的页面 */
interface SearchPage {
  path: string;
  title: string;
  desc: string;
  tags: string[];
  icon?: Component;
  order: number;
}

/** 高亮片段 */
interface TextSegment {
  text: string;
  match: boolean;
}

/** 搜索结果 */
interface SearchResult extends SearchPage {
  titleSegments: TextSegment[];
  descSegments: TextSegment[];
}

const router = useRouter();
const osType = toRef(useSettingsStore(), 'osType');
const modifierKey = computed(() => osType.value === 'MacOS' ? '⌘' : 'Ctrl');

// 搜索数据源：所有有组件、未隐藏、带标题的路由（含首页与全部工具）
const searchPages: SearchPage[] = flattenRoute(routes as RouteRecordRaw[])
    .filter(route => !!route.component && !route.meta?.hidden && !!route.meta?.title)
    .map(route => ({
      path: route.path,
      title: route.meta?.title as string,
      desc: (route.meta?.desc as string) ?? '',
      tags: (route.meta?.tags as string[]) ?? [],
      icon: route.meta?.icon as Component | undefined,
      order: (route.meta?.menuOrder as number) ?? 999,
    }));

/**
 * 计算页面与关键字的匹配得分，0 表示未命中
 * 标题命中权重高于标签，标签高于描述；多个关键字需全部命中
 */
const scorePage = (page: SearchPage, terms: string[]): number => {
  const title = page.title.toLowerCase();
  const desc = page.desc.toLowerCase();
  const tags = page.tags.map(tag => tag.toLowerCase());
  let score = 0;
  for (const term of terms) {
    let termScore = 0;
    if (title === term) termScore = 100;
    else if (title.startsWith(term)) termScore = 80;
    else if (title.includes(term)) termScore = 60;
    if (tags.includes(term)) termScore = Math.max(termScore, 50);
    else if (tags.some(tag => tag.includes(term))) termScore = Math.max(termScore, 40);
    if (desc.includes(term)) termScore = Math.max(termScore, 20);
    if (termScore === 0) return 0;
    score += termScore;
  }
  return score;
};

/** 把文本按关键字切分为高亮片段 */
const buildSegments = (text: string, terms: string[]): TextSegment[] => {
  if (!text) return [];
  if (terms.length === 0) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  terms.forEach(term => {
    let from = 0;
    while (from <= lower.length) {
      const index = lower.indexOf(term, from);
      if (index === -1) break;
      ranges.push([index, index + term.length]);
      from = index + term.length;
    }
  });
  if (ranges.length === 0) return [{ text, match: false }];
  ranges.sort((a, b) => a[0] - b[0]);
  // 合并重叠区间
  const merged: [number, number][] = [];
  ranges.forEach(range => {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  });
  const segments: TextSegment[] = [];
  let cursor = 0;
  merged.forEach(([start, end]) => {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  });
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
};

const query = ref('');
const activeIndex = ref(0);
const terms = computed(() => query.value.trim().toLowerCase().split(/\s+/).filter(Boolean));

/** 搜索结果：关键字为空时展示全部页面，便于快速跳转 */
const results = computed<SearchResult[]>(() => {
  const keywords = terms.value;
  return searchPages
      .map(page => ({ page, score: keywords.length ? scorePage(page, keywords) : 0 }))
      .filter(({ score }) => keywords.length === 0 || score > 0)
      .sort((a, b) => b.score - a.score || a.page.order - b.page.order || a.page.title.localeCompare(b.page.title))
      .map(({ page }) => ({
        ...page,
        titleSegments: buildSegments(page.title, keywords),
        descSegments: buildSegments(page.desc, keywords),
      }));
});

const dialogRef = useTemplateRef<HTMLDialogElement>('dialogRef');
const inputRef = useTemplateRef<HTMLInputElement>('inputRef');
const listRef = useTemplateRef<HTMLElement>('listRef');

/** 打开弹窗并聚焦输入框 */
const openSearch = async () => {
  const dialog = dialogRef.value;
  if (!dialog) return;
  if (!dialog.open) {
    query.value = '';
    activeIndex.value = 0;
    dialog.showModal();
  }
  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
};

/** 跳转到结果对应页面 */
const go = (item: SearchResult) => {
  dialogRef.value?.close();
  if (router.currentRoute.value.path !== item.path) router.push(item.path);
};

/** 滚动选中项到可视区域 */
const scrollActiveIntoView = () => {
  listRef.value?.querySelectorAll<HTMLElement>('[data-result]')[activeIndex.value]
      ?.scrollIntoView({ block: 'nearest' });
};

/** 输入框键盘操作：上下选择、回车打开（Esc 由原生 dialog 关闭） */
const onInputKeydown = (e: KeyboardEvent) => {
  if (e.isComposing) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const total = results.value.length;
    if (total === 0) return;
    const step = e.key === 'ArrowDown' ? 1 : -1;
    activeIndex.value = (activeIndex.value + step + total) % total;
    scrollActiveIntoView();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const item = results.value[activeIndex.value];
    if (item) go(item);
  }
};

// 关键字变化时回到第一项并滚回顶部
watch(query, () => {
  activeIndex.value = 0;
  nextTick(() => listRef.value?.scrollTo({ top: 0 }));
});

/** 全局快捷键：Ctrl/⌘ + K 打开搜索 */
const onGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }
};

onMounted(() => document.addEventListener('keydown', onGlobalKeydown));
onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown));
</script>
