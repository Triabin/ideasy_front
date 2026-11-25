<!-- 首页路由组件 -->
<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4">
    <!-- 问候语 + 日期 + 统计 -->
    <div class="w-full flex flex-wrap items-end justify-between gap-2 px-1">
      <div class="flex flex-col gap-1">
        <HomeGreeting/>
      </div>
      <div class="flex gap-2 text-sm">
        <span class="badge badge-lg badge-outline gap-1.5 font-mono">
          <b class="text-primary">{{ allTools.length }}</b> 个工具
        </span>
        <span v-if="appData.favoriteTools.length" class="badge badge-lg badge-outline gap-1.5 font-mono">
          <b class="text-warning">{{ appData.favoriteTools.length }}</b> 个收藏
        </span>
      </div>
    </div>

    <!-- 粒子时钟 -->
    <div class="relative w-full h-[25lvh] rounded-xl overflow-hidden flex justify-center items-center">
      <!-- 背景点阵（中心清晰、向四周淡出） -->
      <div class="absolute inset-0 pointer-events-none dot-grid"></div>
      <!-- 主题色光晕（缓慢呼吸） -->
      <div class="absolute inset-0 pointer-events-none clock-glow"></div>
      <!-- 四角装饰框 -->
      <span class="corner top-2 left-2 border-t-2 border-l-2 rounded-tl-md"></span>
      <span class="corner top-2 right-2 border-t-2 border-r-2 rounded-tr-md"></span>
      <span class="corner bottom-2 left-2 border-b-2 border-l-2 rounded-bl-md"></span>
      <span class="corner bottom-2 right-2 border-b-2 border-r-2 rounded-br-md"></span>
      <!-- 实时指示灯 -->
      <div class="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] font-mono
                  tracking-wider text-base-content/45 pointer-events-none">
        <span class="relative flex size-1.5">
          <span class="absolute inline-flex size-full rounded-full bg-success opacity-70 animate-ping"></span>
          <span class="relative inline-flex size-1.5 rounded-full bg-success"></span>
        </span>
        实时 · 本地时间
      </div>
      <DynamicClock :color="currRealMode === 'dark' ? '#FFFFFFA1' : '#283747AF'" :density="4"/>
    </div>

    <!-- 搜索 + 标签筛选 -->
    <div class="w-full flex flex-col gap-2">
      <label class="input w-full sm:w-96 sm:self-center rounded-full">
        <Search/>
        <input v-model="keyword" type="search" class="grow" placeholder="搜索工具：名称 / 标签 / 描述" spellcheck="false"/>
        <button v-if="keyword" class="btn btn-ghost btn-xs btn-circle" title="清空搜索" @click="keyword = ''">
          <Close class="size-4"/>
        </button>
      </label>
      <div class="flex flex-wrap justify-center gap-1.5">
        <button class="btn btn-xs rounded-full" :class="activeTag === '' ? 'btn-primary' : 'btn-ghost bg-base-200'"
                @click="activeTag = ''">全部</button>
        <button v-for="tag in hotTags" :key="tag"
                class="btn btn-xs rounded-full" :class="activeTag === tag ? 'btn-primary' : 'btn-ghost bg-base-200'"
                @click="activeTag = activeTag === tag ? '' : tag">{{ tag }}</button>
      </div>
    </div>

    <!-- 收藏的工具 -->
    <section v-if="favoriteRoutes.length && !isFiltering" class="w-full">
      <h2 class="text-sm font-semibold opacity-60 mb-2 px-1">我的收藏</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        <div v-for="tool in favoriteRoutes" :key="tool.path"
             class="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-base-200 px-3 py-2.5 cursor-pointer
                    hover:border-warning hover:shadow-sm transition-all group"
             @click="router.push(tool.path)">
          <component v-if="tool.meta?.icon" :is="tool.meta.icon" class="shrink-0"/>
          <span class="font-medium truncate grow">{{ tool.meta?.title }}</span>
          <button class="btn btn-ghost btn-xs btn-circle text-warning opacity-60 group-hover:opacity-100"
                  title="取消收藏" @click.stop="appData.toggleFavoriteTool(tool.path)">
            <Star filled/>
          </button>
        </div>
      </div>
    </section>

    <!-- 最近使用 -->
    <section v-if="recentRoutes.length && !isFiltering" class="w-full">
      <h2 class="text-sm font-semibold opacity-60 mb-2 px-1">最近使用</h2>
      <div class="flex flex-wrap gap-2">
        <button v-for="tool in recentRoutes" :key="tool.path"
                class="btn btn-sm bg-base-200 border-base-300 font-normal gap-2 hover:border-primary"
                @click="router.push(tool.path)">
          <component v-if="tool.meta?.icon" :is="tool.meta.icon"/>
          {{ tool.meta?.title }}
        </button>
      </div>
    </section>

    <!-- 卡片网格 -->
    <div class="w-full min-h-[40lvh] grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] grid-rows-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
      <div v-if="!filteredRoutes.length" class="col-span-full flex flex-col items-center justify-center gap-2 text-base-content/60">
        <Search class="size-8 opacity-40"/>
        <p>{{ isFiltering ? '没有找到匹配的工具，换个关键词试试' : '啥也没有' }}</p>
        <button v-if="isFiltering" class="btn btn-sm btn-ghost" @click="keyword = ''; activeTag = ''">清除筛选条件</button>
      </div>
      <!-- 卡片 -->
      <div v-for="card in filteredRoutes"
           :key="card.path"
           title="点击跳转"
           @click="router.push(card.path)"
           class="relative flex flex-col justify-start gap-2.5 border border-accent/10 rounded-md p-6 overflow-hidden bg-base-200/55
             max-h-56 shadow-sm cursor-pointer hover:border-primary hover:shadow-[0_0_10px_var(--color-primary)] hover:-translate-y-1.25
             transition-all duration-200 ease-in-out group">
        <!-- 收藏按钮 -->
        <button class="btn btn-ghost btn-sm btn-circle absolute top-2 right-2 z-10
                       opacity-0 group-hover:opacity-100 transition-opacity"
                :class="appData.favoriteTools.includes(card.path) ? 'text-warning opacity-100!' : 'text-base-content/50'"
                :title="appData.favoriteTools.includes(card.path) ? '取消收藏' : '收藏'"
                @click.stop="appData.toggleFavoriteTool(card.path)">
          <Star :filled="appData.favoriteTools.includes(card.path)"/>
        </button>
        <!-- 卡片标题 -->
        <div class="flex items-center gap-2.5">
          <component v-if="card.meta?.icon" :is="card.meta.icon"/>
          <h2 class="text-xl font-semibold">{{ card.meta?.title }}</h2>
        </div>
        <!-- 卡片标签（仅展示，筛选统一走顶部标签按钮，避免点卡片时误触） -->
        <div v-if="cardTags(card).length" class="flex flex-wrap gap-1.5">
          <span v-for="(tag, ti) in cardTags(card)"
                :key="ti"
                class="badge badge-sm border-none text-white/90 font-medium"
                :style="{ backgroundColor: tagColor(tag) }"
          >{{ tag }}</span>
        </div>
        <!-- 描述（超出最大高度时按行截断，保证卡片高度一致） -->
        <p class="font-normal line-clamp-3" :title="(card.meta?.desc || '') as string">{{ card.meta?.desc }}</p>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, toRef } from 'vue';
import { routes, flattenRoute } from '@/router';
import { useRouter, type RouteRecordRaw } from 'vue-router';
import useSettingsStore from '@/stores/settingsStore';
import useAppDataStore from '@/stores/appData';
import DynamicClock from '@/components/DynamicClock';
import Search from '@/components/icons/Search.vue';
import Close from '@/components/icons/Close.vue';
import Star from '@/components/icons/Star.vue';
import HomeGreeting from '@/components/HomeGreeting.vue';

const currRealMode = toRef(useSettingsStore(), 'currRealMode');
const appData = useAppDataStore();
const router = useRouter();

/* ------------------------- 工具数据 ------------------------- */
const allTools = computed(() => flattenRoute(routes)
    .filter(route => !route.meta?.hidden)
    .filter(route => route.path.startsWith('/tools/'))
);
const routeByPath = (path: string) => allTools.value.find(r => r.path === path);

/** 收藏的工具（过滤掉已下线的路由） */
const favoriteRoutes = computed(() => appData.favoriteTools.map(routeByPath).filter((r): r is RouteRecordRaw => !!r));
/** 最近使用（过滤掉已下线的路由） */
const recentRoutes = computed(() => appData.recentTools.map(r => routeByPath(r.path)).filter((r): r is RouteRecordRaw => !!r));

/* ------------------------- 搜索与筛选 ------------------------- */
const keyword = ref('');
const activeTag = ref('');
const isFiltering = computed(() => !!keyword.value.trim() || !!activeTag.value);

/** 热门标签：按出现次数取前 8 个 */
const hotTags = computed(() => {
  const count = new Map<string, number>();
  for (const tool of allTools.value) {
    for (const tag of cardTags(tool)) count.set(tag, (count.get(tag) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);
});

const filteredRoutes = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const words = kw.split(/\s+/).filter(Boolean);
  return allTools.value.filter(tool => {
    if (activeTag.value && !cardTags(tool).includes(activeTag.value)) return false;
    if (!words.length) return true;
    const title = String(tool.meta?.title ?? '').toLowerCase();
    const desc = String(tool.meta?.desc ?? '').toLowerCase();
    const tags = cardTags(tool).join(' ').toLowerCase();
    return words.every(w => title.includes(w) || desc.includes(w) || tags.includes(w));
  });
});

/**
 * 获取卡片路由的标签列表
 * @param card {RouteRecordRaw} 卡片路由
 */
const cardTags = (card: RouteRecordRaw): string[] => (card.meta?.tags as string[] | undefined) ?? [];

/** 标签颜色调色板（保证同名标签颜色稳定） */
const TAG_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#DC2626', '#EA580C', '#D97706', '#CA8A04',
  '#65A30D', '#16A34A', '#059669', '#0D9488', '#0891B2', '#0284C7',
  '#2563EB', '#4F46E5', '#7C3AED', '#9333EA', '#C026D3', '#DB2777',
  '#E11D48', '#BE123C', '#B91C1C', '#9A3412', '#854D0E', '#4D7C0F',
  '#166534', '#134E4A', '#155E75', '#1E40AF', '#3730A3', '#5B21B6',
  '#86198F', '#9D174D',
];

/**
 * 根据标签文本生成稳定的彩色背景色
 * @param tag {string} 标签文本
 */
const tagColor = (tag: string): string => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash + tag.charCodeAt(i)) | 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};
</script>

<style lang="css" scoped>
/* 点阵背景：中心清晰，向四周淡出，避免与数字抢视觉 */
.dot-grid {
  color: var(--color-base-content);
  opacity: 0.09;
  background-image: radial-gradient(currentColor 1px, transparent 1px);
  background-size: 18px 18px;
  background-position: center;
  mask-image: radial-gradient(ellipse at center, #000 20%, transparent 72%);
  -webkit-mask-image: radial-gradient(ellipse at center, #000 20%, transparent 72%);
}

/* 主题色光晕：随主题色变化，缓慢呼吸 */
.clock-glow {
  background: radial-gradient(ellipse at center,
    color-mix(in oklab, var(--color-primary) 18%, transparent) 0%,
    color-mix(in oklab, var(--color-primary) 6%, transparent) 45%,
    transparent 72%);
  animation: clock-breathe 9s ease-in-out infinite alternate;
}

@keyframes clock-breathe {
  from {
    opacity: 0.55;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1.05);
  }
}

/* 四角装饰框 */
.corner {
  position: absolute;
  width: 18px;
  height: 18px;
  border-color: color-mix(in oklab, var(--color-primary) 45%, transparent);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .clock-glow {
    animation: none;
  }
}
</style>
