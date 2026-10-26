<template>
  <!--
    高度使用 dvh（动态视口单位）：手机上浏览器底部工具栏收起/展开时，
    dvh 会实时跟随可视区域变化，页面底部不会被浏览器导航栏遮挡。
    min-h-screen 作为不支持 dvh 的浏览器的兜底；PC 端地址栏固定，dvh == 100vh，布局不受影响。
  -->
  <div class="flex flex-col min-h-screen h-dvh w-screen overflow-scroll gap-0.5 overflow-y-hidden pb-[env(safe-area-inset-bottom)]">
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
    <div ref="mainWrapper" class="flex-1 flex justify-center min-h-0">
      <!-- 主体内容区 -->
      <div ref="contentArea" class="w-160 h-full md:w-3xl lg:w-5xl xl:w-7xl 2xl:w-360 bg-base-100 overflow-y-scroll no-scrollbar">
        <RouterView/>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ThemeController from '@/components/ThemeController';
import { useTemplateRef } from 'vue';
import useWheelOuter2Inner from '@/common/useWheelOuter2Inner.ts';

// 主体外层容器与内容滚动区
const mainWrapper = useTemplateRef<HTMLElement>('mainWrapper');
const contentArea = useTemplateRef<HTMLElement>('contentArea');
/* ---------------- 侧边滚轮 → 内容区平滑滚动 ---------------- */
useWheelOuter2Inner(mainWrapper, contentArea);
</script>
