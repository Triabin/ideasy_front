<template>
  <div class="flex flex-col h-screen w-screen overflow-scroll gap-0.5 overflow-y-hidden">
    <!-- 头部 -->
    <div class="min-h-16 h-16 flex justify-center items-center bg-base-300/50 shadow-sm">
      <!-- 头部内容区 -->
      <div class="navbar w-160 md:w-192 lg:w-256 xl:w-320 2xl:w-360 flex items-center">
        <!-- Logo -->
        <div class="navbar-start">
          <RouterLink to="/"><img src="/favicon.png" alt="灵光"></RouterLink>
        </div>
        <!-- 导航栏路由 -->
        <div class="navbar-center">
          <TopNav :routes="routes"/>
        </div>
        <!-- 功能按钮 -->
        <div class="navbar-end">
          <ThemeController/>
        </div>
      </div>
    </div>
    <!-- 主体 -->
    <div class="flex-1 flex justify-center">
      <!-- 主体内容区 -->
      <div class="w-160 md:w-192 lg:w-256 xl:w-320 2xl:w-360 bg-base-100 overflow-y-scroll no-scrollbar">
        <RouterView/>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ThemeController from '@/components/ThemeController';
import TopNav from '@/components/TopNav';
import { routes } from '@/router';
</script>
