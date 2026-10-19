<template>
  <div class="flex flex-col h-screen w-screen overflow-scroll gap-0.5 overflow-y-hidden">
    <!-- 头部 -->
    <div class="min-h-16 h-16 flex justify-center items-center bg-base-300/50 shadow-sm">
      <!-- 头部内容区 -->
      <div class="navbar w-160 md:w-3xl lg:w-5xl xl:w-7xl 2xl:w-360 flex items-center">
        <!-- Logo -->
        <div class="navbar-start text-2xl">
          <RouterLink to="/"><img src="/favicon.png" class="size-10" alt="灵光"></RouterLink>
          <RouterLink to="/">
            <div class="text-xl ml-2 italic overflow-hidden whitespace-nowrap text-ellipsis">
              能网页&nbsp;&nbsp;不软件
            </div>
          </RouterLink>
        </div>
        <!-- 导航栏路由 -->
        <div class="navbar-center">
        <!-- <TopNav :routes="navs"/>-->
        </div>
        <!-- 功能按钮 -->
        <div class="navbar-end">
          <ThemeController/>
        </div>
      </div>
    </div>
    <!-- 主体 -->
    <div class="flex-1 flex justify-center min-h-0">
      <!-- 主体内容区 -->
      <div class="w-160 h-full md:w-3xl lg:w-5xl xl:w-7xl 2xl:w-360 bg-base-100 overflow-y-scroll no-scrollbar">
        <RouterView/>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ThemeController from '@/components/ThemeController';
</script>
