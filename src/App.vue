<template>
  <div class="flex flex-col h-screen w-screen overflow-scroll gap-0.5">
    <!-- 头部 -->
    <div class="h-16 flex justify-center items-center border-b bg-base-200/50 border-base-300">
      <!-- 头部内容区 -->
      <div class="w-160 md:w-192 lg:w-256 xl:w-320 2xl:w-360 flex items-center">       
        <!-- Logo -->
        <div class="w-16 h-16 flex justify-center items-center">
          <RouterLink to="/"><img src="/favicon.png" alt="灵光"></RouterLink>
        </div>
        <!-- 导航栏路由 -->
        <div class="flex-2 h-16 flex justify-start items-center">
          <template v-for="route in routes">
            <RouterLink v-if="route.meta?.title" :to="route.path">{{ route.meta.title }}</RouterLink>
          </template>
        </div>
        <!-- 功能按钮 -->
        <div class="flex-1 h-16 flex justify-end items-center gap-2">
          <ThemeController/>
        </div>
      </div>
    </div>
    <!-- 主体 -->
    <div class="flex-1 flex justify-center">
      <!-- 主体内容区 -->
      <div class="w-160 md:w-192 lg:w-256 xl:w-320 2xl:w-360 bg-base-100">
        <RouterView/>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ThemeController from '@/components/ThemeController';
import { routes } from '@/router';
</script>
