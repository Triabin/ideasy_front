<!-- 首页路由组件 -->
<template>
  <div class="flex flex-col items-center justify-center gap-2">
    <div class="w-full h-80 bg-base-200 rounded-md">
      <DynamicClock :color="currRealMode === 'dark' ? '#FFFFFFA1' : '#283747AF'"
                    font="sans-serif"
                    :density="4"
      />
    </div>
    <div class="w-full h-14">
      <GlobalSearchBox @search="(keyword: string) => console.log(`keyword: ${keyword}`)"/>
    </div>
    <div class="w-full"></div>
  </div>
</template>
<script lang="ts" setup>
import { toRef } from 'vue';
import DynamicClock from '@/components/DynamicClock';
import GlobalSearchBox from '@/components/GlobalSearchBox';
import useSettingsStore from '@/stores/settingsStore';

const currRealMode = toRef(useSettingsStore(), 'currRealMode');
</script>
<style lang="css" scoped>

</style>
