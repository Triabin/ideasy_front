<!-- 首页路由组件 -->
<template>
  <div class="flex flex-col items-center justify-center gap-1">
    <!-- 粒子时钟 -->
    <div class="w-full h-[25lvh] bg-base-200 rounded-md m-4 flex justify-center items-center">
      <DynamicClock :color="currRealMode === 'dark' ? '#FFFFFFA1' : '#283747AF'" :density="4"/>
    </div>
    <!-- 搜索框 -->
    <div class="w-full h-[5lvh] flex justify-center items-center">
      <GlobalSearchBox v-model="keyword"/>
    </div>
    <!-- 卡片网格 -->
    <div class="w-full min-h-[70lvh] grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] grid-rows-[repeat(auto-fill,minmax(200px,1fr))] gap-5 p-5">
      <div v-if="keyword.trim() && filteredCardRoutes.length === 0"
           class="col-span-full flex items-center justify-center text-base-content/60">
        没有找到与“{{ keyword.trim() }}”匹配的工具
      </div>
      <!-- 卡片 -->
      <div v-for="(card, index) in filteredCardRoutes"
           :key="index"
           title="点击跳转"
           @click="() => router.push(card.path)"
           class="flex flex-col justify-start gap-2.5 border border-accent/10 rounded-md p-6 overflow-hidden bg-base-200/55
             shadow-sm cursor-pointer hover:border-primary hover:shadow-[0_0_10px_var(--color-primary)] hover:-translate-y-1.25
             transition-all duration-200 ease-in-out">
        <!-- 卡片标题 -->
        <div class="flex items-center gap-2.5">
          <!-- 卡片图标 -->
          <component v-if="card.meta?.icon" :is="card.meta.icon"/>
          <!-- 卡片标题 -->
          <h2 class="text-xl font-semibold">{{ card.meta?.title }}</h2>
        </div>
        <!-- 卡片标签 -->
        <div v-if="cardTags(card).length" class="flex flex-wrap gap-1.5">
          <span v-for="(tag, ti) in cardTags(card)"
                :key="ti"
                class="badge badge-sm border-none text-white/90 font-medium"
                :style="{ backgroundColor: tagColor(tag) }"
                @click.stop="() => keyword = tag"
          >{{ tag }}</span>
        </div>
        <!-- 描述 -->
        <p class="font-normal">{{ card.meta?.desc }}</p>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, toRef } from 'vue';
import DynamicClock from '@/components/DynamicClock';
import GlobalSearchBox from '@/components/GlobalSearchBox';
import useSettingsStore from '@/stores/settingsStore';
import { routes, flattenRoute } from '@/router';
import { useRouter, type RouteRecordRaw } from 'vue-router';

const currRealMode = toRef(useSettingsStore(), 'currRealMode');
const cardRoutes = computed(() => flattenRoute(routes)
    .filter(route => !route.meta?.hidden)
    .filter(route => route.path.startsWith('/tools/'))
);
const router = useRouter();
// 搜索关键字
const keyword = ref<string>('');

/**
 * 获取卡片路由的标签列表
 * @param card {RouteRecordRaw} 卡片路由
 */
const cardTags = (card: RouteRecordRaw): string[] => {
  return (card.meta?.tags as string[] | undefined) ?? [];
};

/** 标签颜色调色板（保证同名标签颜色稳定） */
const TAG_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E',
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

/**
 * 根据关键字过滤工具卡片
 * 匹配各工具页面 _page.ts 导出对象的 title、desc 与 tags 字段（不区分大小写，支持空格分隔多关键词）
 */
const filteredCardRoutes = computed(() => {
  const kws = keyword.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (kws.length === 0) return cardRoutes.value;
  return cardRoutes.value.filter(card => {
    const title = (card.meta?.title as string ?? '').toLowerCase();
    const desc = (card.meta?.desc as string ?? '').toLowerCase();
    const tags = cardTags(card).map(t => t.toLowerCase());
    return kws.every(kw => title.includes(kw) || desc.includes(kw) || tags.some(tag => tag.includes(kw)));
  });
});
</script>
