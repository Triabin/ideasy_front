<template>
  <!--
    高度使用 .h-viewport（内部为 100vh → 100dvh 双声明渐进增强，见 styles/index.css）：
    手机上浏览器底部工具栏收起/展开时，dvh 会实时跟随可视区域变化，页面底部不会被遮挡；
    不支持 dvh 的老旧浏览器自动回退到 100vh。PC 端地址栏固定，dvh == 100vh，布局不受影响。
    注意：这里不能叠加 min-h-screen —— 移动端 100vh ≥ dvh，且 min-height 优先于 height，
    会把容器撑得比可视区域高，底部内容反而被浏览器工具栏遮挡。
    根容器使用 daisyUI drawer：移动端（<md）通过导航栏汉堡按钮从右侧滑出抽屉菜单，
    桌面端抽屉不可触发、不占布局空间。
  -->
  <div class="drawer drawer-end w-screen h-viewport">
    <!-- 抽屉开关：checkbox 状态用 v-model 同步，便于点击菜单项后程序化关闭 -->
    <input id="nav-drawer" v-model="drawerOpen" type="checkbox" class="drawer-toggle"/>
    <!--
      页面主体内容。
      高度必须显式钉住视口（.h-viewport）：.drawer 是 grid 容器，隐式行按内容 auto 撑高，
      若不约束 drawer-content 高度，内部 flex-1 min-h-0 链条失效，contentArea 不会溢出，
      页面将整体无法滚动（body 是 overflow-hidden，没有兜底滚动条）。
    -->
    <div class="drawer-content h-viewport flex flex-col gap-0.5 pb-[env(safe-area-inset-bottom)]">
      <!-- 头部 -->
      <div class="shrink-0 min-h-16 h-16 flex justify-center items-center bg-base-300/50 shadow-sm">
        <!-- 头部内容区：移动端占满视口宽，md 及以上才使用定宽居中，避免小屏被挤压溢出 -->
        <div class="navbar w-full max-md:px-3 md:w-3xl lg:w-5xl xl:w-7xl 2xl:w-360 flex items-center">
          <!-- 导航栏左侧 -->
          <div class="navbar-start text-2xl">
            <NavbarLeft/>
          </div>
          <!-- 导航栏中间 -->
          <!-- <div class="navbar-center"> -->
            <!-- <TopNav :routes="navs"/>-->
          <!-- </div> -->
          <!-- 导航栏右侧 -->
          <div class="navbar-end gap-1.5 md:gap-3 md:flex-1">
            <NavbarRight/>
          </div>
        </div>
      </div>
      <!-- 主体 -->
      <div ref="mainWrapper" class="flex-1 flex justify-center min-h-0 overflow-hidden">
        <!-- 主体内容区：同头部，移动端占满视口宽 -->
        <div ref="contentArea" class="w-full h-full md:w-3xl lg:w-5xl xl:w-7xl 2xl:w-360 bg-base-100 overflow-y-scroll no-scrollbar">
          <RouterView/>
        </div>
      </div>
    </div>
    <!--
      移动端抽屉：收纳博客、GitHub 外链入口与完整的主题设定。
      层级用原生工具类 z-1200（≈ .z-overlay）而非语义类：daisyUI 组件样式位于
      utilities 层内嵌的 daisyui 子层，会覆盖 components 层中的 .z-* 语义类
      （.drawer-side 自带 z-index:10，低于页面里 z-sticky/z-overlay 元素），
      只有 utilities 层的直接工具类能稳定压过它。
    -->
    <div class="drawer-side z-overlay">
      <label for="nav-drawer" aria-label="关闭菜单" class="drawer-overlay"></label>
      <aside class="flex flex-col w-72 max-w-[85vw] min-h-full bg-base-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <!-- 主题设定：复用桌面端同一组件，其下拉面板 Teleport 到 body，不会被抽屉裁剪 -->
        <div class="divider text-xs opacity-60">主题设定</div>
        <div class="flex justify-center">
          <ThemeController/>
        </div>
        <!-- 外链菜单 -->
        <div class="divider text-xs opacity-60">外链菜单</div>
        <ul class="menu rounded-box mt-2">
          <li>
            <a title="我的博客" @click="openDrawerLink('https://spirit.triabin.cn')">
              <img src="https://spirit.triabin.cn/icons/favicon.png" alt="spirit-favicon" class="size-5"/>
              灵犀Spirit（博客）
            </a>
          </li>
          <li>
            <a title="访问GitHub仓库" @click="openDrawerLink('https://github.com/Triabin/ideasy_front')">
              <GitHub :size="18"/>
              GitHub 仓库
            </a>
          </li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<script lang="ts" setup>
import NavbarRight from '@/components/NavbarRight';
import NavbarLeft from '@/components/NavbarLeft';
import ThemeController from '@/components/ThemeController';
import GitHub from '@/components/icons/GitHub.vue';
import { ref, useTemplateRef } from 'vue';
import { openUrl } from '@/common/utils.ts';
import useWheelOuter2Inner from '@/composables/useWheelOuter2Inner.ts';
import useScrollRestoration from '@/composables/useScrollRestoration.ts';

/* ---------------- 移动端抽屉 ---------------- */
// 抽屉开合状态（绑定 drawer-toggle checkbox 的 v-model）
const drawerOpen = ref(false);

/** 点击抽屉内的外链：打开链接并关闭抽屉 */
const openDrawerLink = (url: string) => {
  openUrl(url);
  drawerOpen.value = false;
};

// 主体外层容器与内容滚动区
const mainWrapper = useTemplateRef<HTMLElement>('mainWrapper');
const contentArea = useTemplateRef<HTMLElement>('contentArea');
/* ---------------- 侧边滚轮 → 内容区平滑滚动 ---------------- */
useWheelOuter2Inner(mainWrapper, contentArea);
useScrollRestoration(contentArea);
</script>
