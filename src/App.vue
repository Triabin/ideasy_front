<template>
  <!--
    高度使用 .h-viewport（内部为 100vh → 100dvh 双声明渐进增强，见 styles/index.css）：
    手机上浏览器底部工具栏收起/展开时，dvh 会实时跟随可视区域变化，页面底部不会被遮挡；
    不支持 dvh 的老旧浏览器自动回退到 100vh。PC 端地址栏固定，dvh == 100vh，布局不受影响。
    注意：这里不能叠加 min-h-screen —— 移动端 100vh ≥ dvh，且 min-height 优先于 height，
    会把容器撑得比可视区域高，底部内容反而被浏览器工具栏遮挡。
  -->
  <div class="flex flex-col h-viewport w-screen gap-0.5 pb-[env(safe-area-inset-bottom)]">
    <!-- 头部 -->
    <div class="shrink-0 min-h-16 h-16 flex justify-center items-center bg-base-300/50 shadow-sm">
      <!-- 头部内容区 -->
      <div class="navbar w-160 md:w-3xl lg:w-5xl xl:w-7xl 2xl:w-360 flex items-center">
        <!-- 导航栏左侧 -->
        <div class="navbar-start text-2xl">
          <!-- Logo -->
          <RouterLink to="/">
            <div class="rounded-xl size-9 bg-primary flex justify-center items-center font-bold text-primary-content round-font">灵</div>
          </RouterLink>
          <RouterLink to="/">
            <span class="text-xl ml-2 font-bold overflow-hidden whitespace-nowrap text-ellipsis">
              能网页&nbsp;&nbsp;不软件
            </span>
          </RouterLink>
        </div>
        <!-- 导航栏中间 -->
        <div class="navbar-center">
          <!-- <TopNav :routes="navs"/>-->
        </div>
        <!-- 导航栏右侧 -->
        <div class="navbar-end gap-3">
          <NavbarRight/>
        </div>
      </div>
    </div>
    <!-- 主体 -->
    <div ref="mainWrapper" class="flex-1 flex justify-center min-h-0 overflow-hidden">
      <!-- 主体内容区 -->
      <div ref="contentArea" class="w-160 h-full md:w-3xl lg:w-5xl xl:w-7xl 2xl:w-360 bg-base-100 overflow-y-scroll no-scrollbar">
        <RouterView/>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import NavbarRight from '@/components/NavbarRight';
import { useTemplateRef } from 'vue';
import useWheelOuter2Inner from '@/composables/useWheelOuter2Inner.ts';

// 主体外层容器与内容滚动区
const mainWrapper = useTemplateRef<HTMLElement>('mainWrapper');
const contentArea = useTemplateRef<HTMLElement>('contentArea');
/* ---------------- 侧边滚轮 → 内容区平滑滚动 ---------------- */
useWheelOuter2Inner(mainWrapper, contentArea);
</script>
