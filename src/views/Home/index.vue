<!-- 首页路由组件 -->
<template>
  <div class="flex flex-col items-center justify-center gap-1">
    <div class="w-full h-[25lvh] bg-base-200 rounded-md">
      <DynamicClock :color="currRealMode === 'dark' ? '#FFFFFFA1' : '#283747AF'"
                    font="sans-serif"
                    :density="4"
      />
    </div>
    <div class="w-full h-[5lvh] flex justify-center items-center">
      <GlobalSearchBox @search="(keyword: string) => console.log(`keyword: ${keyword}`)"/>
    </div>
    <div class="w-full h-[70lvh] grid sm:grid-cols-8 sm:gap-3 md:grid-cols-12 md:gap-3 lg:gap-4 overflow-y-scroll no-scrollbar">
    </div>
  </div>
</template>
<script lang="ts" setup>
import { toRef } from 'vue';
import DynamicClock from '@/components/DynamicClock';
import GlobalSearchBox from '@/components/GlobalSearchBox';
import useSettingsStore from '@/stores/settingsStore';

const currRealMode = toRef(useSettingsStore(), 'currRealMode');
</script>
