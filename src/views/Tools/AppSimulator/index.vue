<!-- 应用模拟器路由组件 -->
<template>
  <h1 class="card-title mt-4">应用模拟器</h1>
  <div class="w-full flex justify-between items-center mt-6">
    <div class="tabs tabs-lift">
      <input type="radio" v-model="platform" class="tab" aria-label="手机" value="phone"/>
      <input type="radio" v-model="platform" class="tab" aria-label="平板" value="tablet"/>
      <input type="radio" v-model="platform" class="tab" aria-label="电脑" value="desktop"/>
    </div>

    <div class="tabs tabs-border">
      <label v-if="platform === 'phone' || platform === 'tablet'" class="tab">
        <input type="radio" v-model="system" value="Android"/>
        <Android :size="16"/>&nbsp;安卓
      </label>
      <label v-if="platform === 'phone' || platform === 'tablet'" class="tab">
        <input type="radio" v-model="system" value="iOS"/>
        <iOS :size="16"/>&nbsp;苹果
      </label>
      <label v-if="platform === 'desktop'" class="tab">
        <input type="radio" v-model="system" value="Windows"/>
        <Windows :size="13"/>&nbsp;Windows
      </label>
      <label v-if="platform === 'desktop'" class="tab">
        <input type="radio" v-model="system" value="MacOS"/>
        <MacOS :size="16"/>&nbsp;苹果
      </label>
      <label class="tab">
        <input type="radio" v-model="system" value="HarmonyOS"/>
        <HarmonyOS :size="16"/>&nbsp;鸿蒙
      </label>
    </div>
  </div>
  <div class="w-full mt-6 rounded-md">

  </div>
</template>
<script lang="ts" setup>
import { ref, watch } from 'vue';
import HarmonyOS from '@/components/icons/HarmonyOS.vue';
import Windows from '@/components/icons/Windows.vue';
import Android from '@/components/icons/Android.vue';
import MacOS from '@/components/icons/MacOS.vue';
import iOS from '@/components/icons/iOS.vue';

const platform = ref<'phone' | 'tablet' | 'desktop'>('phone');
const system = ref<'Android' | 'iOS' | 'Windows' | 'MacOS' | 'HarmonyOS'>('Android');

watch(platform, (value) => {
  // 切换平台时，清空系统选择
  if (value === 'desktop') {
    system.value = 'Windows';
  } else if (value === 'tablet') {
    system.value = 'Android';
  } else if (value === 'phone') {
    system.value = 'Android';
  }
});
</script>
<style lang="css" scoped>

</style>
