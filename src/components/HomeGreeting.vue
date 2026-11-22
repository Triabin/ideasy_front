<!-- 首页问候语模块组件 -->
<template>
  <h1 class="text-2xl sm:text-3xl font-bold">{{ greeting }}，欢迎回来</h1>
  <p class="text-sm opacity-60 font-mono">{{ today }}</p>
  <p class="text-sm opacity-60 font-mono">{{ lunarToday }}</p>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import {
  isWorkday,
  getDayDetail,
  getLunarFestivals,
  getLunarDate,
  getHolidaysInRange,
  getSolarTerms,
} from 'chinese-days';

const now = new Date();
const start = now.format('yyyy-01-01');
const end = now.format('yyyy-12-31');
const todayDate = now.format('yyyy-MM-dd');
// 节假日
const holidayMap = Object.fromEntries(getHolidaysInRange(start, end, false)
    .map(d => getDayDetail(d))
    .map(d => [d.date, d])) as Record<string, ReturnType<typeof getDayDetail>>;
// 民俗节日与纪念日
const lunarFestivalMap = Object.fromEntries(getLunarFestivals(start, end)
    .map(d => [d.date, d])) as Record<string, ReturnType<typeof getLunarFestivals>[number]>;
// 24节气
const solarTermMap = Object.fromEntries(getSolarTerms(start, end)
    .map(d => [d.date, d])) as Record<string, ReturnType<typeof getSolarTerms>[number]>;

const greeting = computed(() => {
  const h = now.getHours();
  if (h < 5) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
});
const today = computed(() => {
  const todayItems = [];
  todayItems.push(now.format('yyyy年MM月dd日 EEE'));
  const holiday = holidayMap[todayDate];
  if (holiday) {
    todayItems.push(holiday.name.split(',')[1]);
  }
  todayItems.push(isWorkday(now) ? '搬砖搬砖😕' : '不上班😊');
  todayItems.push('今天想做点什么？');
  return todayItems.join(' · ')
});
const lunarToday = computed(() => {
  const lunarTodayItems = [];
  const lunar = getLunarDate(now);
  // const zhiIdx = Math.floor(((now.getHours() + 1) % 24) / 2);
  lunarTodayItems.push(`农历${lunar.yearCyl}（${lunar.zodiac}）年${lunar.lunarMonCN}${lunar.lunarDayCN}`);
  const solarTerm = solarTermMap[todayDate];
  if (solarTerm) {
    lunarTodayItems.push(solarTerm.name);
  }
  const lunarFestival = lunarFestivalMap[todayDate];
  if (lunarFestival) {
    lunarTodayItems.push(`【${lunarFestival.name.join('、')}】`);
  }
  return lunarTodayItems.join(' · ');
});
</script>
