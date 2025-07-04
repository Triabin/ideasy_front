<!-- 首页路由组件 -->
<template>
  <div class="flex flex-col items-center justify-center gap-2">
    <div class="w-full h-80 bg-base-200 rounded-md">
      <DynamicClock :color="theme.mode === 'dark' ? '#FFFFFFA1' : '#283747AF'"
                    font="sans-serif"
                    :density="4"
      />
    </div>
    <div class="w-full h-14">
      <label class="input w-full">
        <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <g
              stroke-linejoin="round"
              stroke-linecap="round"
              stroke-width="2.5"
              fill="none"
              stroke="currentColor"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </g>
        </svg>
        <input type="search" class="grow" placeholder="你找啥？" />
        <kbd class="kbd kbd-sm">⌘</kbd>
        <kbd class="kbd kbd-sm">K</kbd>
      </label>
    </div>
    <div class="w-full"></div>
  </div>
</template>
<script lang="ts" setup>
import DynamicClock from '@/components/DynamicClock';
import useSettingsStore from '@/stores/settingsStore';

const { theme } = useSettingsStore();
</script>
<style lang="css" scoped>

</style>
