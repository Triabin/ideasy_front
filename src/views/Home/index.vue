<!-- 首页路由组件 -->
<template>
  <div class="flex flex-col items-center justify-center gap-1">
    <div class="w-full h-[25lvh] bg-base-200 rounded-md mt-2">
      <DynamicClock :color="currRealMode === 'dark' ? '#FFFFFFA1' : '#283747AF'"
                    font="sans-serif"
                    :density="4"
      />
    </div>
    <div class="w-full h-[5lvh] flex justify-center items-center">
      <GlobalSearchBox @search="(keyword: string) => console.log(`keyword: ${keyword}`)"/>
    </div>
    <div class="w-full h-[70lvh] grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] grid-rows-[repeat(auto-fill,minmax(200px,1fr))]
       gap-5 overflow-y-scroll no-scrollbar pt-10">
      <div v-for="(card, index) in cardRoutes"
           :key="index"
           title="点击跳转"
           @click="() => router.push(card.path)"
           class="flex flex-col justify-start gap-2.5 border border-accent/10 rounded-md p-6 overflow-hidden bg-base-200/55
             shadow-sm cursor-pointer hover:border-primary hover:shadow-[0_0_10px_var(--color-primary)] hover:translate-y-[-5px]
             transition-all duration-200 ease-in-out">
        <div class="flex items-center gap-2.5">
          <component v-if="card.meta?.icon" :is="card.meta.icon"/>
          <h2 class="text-xl font-semibold">{{ card.meta?.title }}</h2>
        </div>
        <p class="font-normal">{{ card.meta?.desc }}</p>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, toRef } from 'vue';
import DynamicClock from '@/components/DynamicClock';
import GlobalSearchBox from '@/components/GlobalSearchBox';
import useSettingsStore from '@/stores/settingsStore';
import { routes, flattenRoute } from '@/router';
import { useRouter } from 'vue-router';

const currRealMode = toRef(useSettingsStore(), 'currRealMode');
const cardRoutes = computed(() => flattenRoute(routes).filter(route => route.path.startsWith('/tools/')));
const router = useRouter();
console.log(cardRoutes.value);
console.log(flattenRoute(routes));
console.log(routes);
</script>
