<template>
  <div class="flex flex-col h-screen w-screen overflow-scroll gap-0.5">
    <!-- 头部 -->
    <div class="h-16 flex justify-center items-center border-b border-gray-300">
      <!-- 头部内容区 -->
      <div class="w-160 md:w-192 lg:w-256 xl:w-320 2xl:w-360 flex items-center">
        <!-- Logo -->
        <div class="w-16 h-16 flex justify-center items-center"></div>
        <!-- 导航栏路由 -->
        <div class="flex-2 h-16 flex justify-start items-center"></div>
        <!-- 功能按钮 -->
        <div class="flex-1 h-16 flex justify-end items-center">
          <ToggleLightDark/>
        </div>
      </div>
    </div>

    <!-- 主体 -->
    <div class="flex-1 bg-base-100 flex justify-center">
      <!-- 主体内容区 -->
      <div class="w-160 md:w-192 lg:w-256 xl:w-320 2xl:w-360">
        <RouterView/>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ToggleLightDark from '@/components/ToggleLightDark';
</script>
