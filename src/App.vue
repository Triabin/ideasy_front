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
import { ref, onMounted, onBeforeUnmount } from 'vue';

// 主体外层容器与内容滚动区
const mainWrapper = ref<HTMLElement | null>(null);
const contentArea = ref<HTMLElement | null>(null);

/* ---------------- 侧边滚轮 → 内容区平滑滚动 ---------------- */

// rAF 动画句柄与目标元素缓存
let rafId = 0;
let animTarget: HTMLElement | null = null;
// 累计待消化的滚轮量（像素）
let pendingDelta = 0;
// 当前速度（px/frame），用于指数衰减模拟惯性
let velocity = 0;

// 平滑参数
const SMOOTH_FACTOR = 0.18; // 每帧向目标速度靠拢的比例（越小越"柔"）
const DECAY = 0.9;          // 无新输入时的速度衰减（模拟原生惯性）
const MAX_VELOCITY = 60;    // 限制单帧最大速度，防止触控板快速甩动时失控

/** 把行/页模式的 deltaY 换算成像素 */
function toPixels(delta: number, deltaMode: number, viewportH: number): number {
  if (deltaMode === 1) return delta * 16;          // DOM_DELTA_LINE
  if (deltaMode === 2) return delta * viewportH;   // DOM_DELTA_PAGE
  return delta;                                    // DOM_DELTA_PIXEL
}

/** 逐帧驱动滚动：速度平滑追踪 + 惯性衰减 */
function stepSmoothScroll() {
  const el = animTarget;
  if (!el) return;

  // 消化新的滚轮输入：让速度渐进地追上目标增量（并限制上限）
  if (pendingDelta !== 0) {
    const clamped = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, pendingDelta));
    velocity += (clamped - velocity) * SMOOTH_FACTOR;
    pendingDelta = 0;
  } else {
    // 没有新输入时缓慢衰减，模拟原生惯性滚动
    velocity *= DECAY;
    if (Math.abs(velocity) < 0.5) velocity = 0;
  }

  if (velocity !== 0) {
    const before = el.scrollTop;
    el.scrollTop += velocity;
    // 触顶/触底后清掉剩余速度，避免"憋劲"感
    if (el.scrollTop === before) velocity = 0;
  }

  if (velocity !== 0 || pendingDelta !== 0) {
    rafId = requestAnimationFrame(stepSmoothScroll);
  } else {
    // 动画结束，清理状态（无需 cancel，本帧就是最后一帧）
    rafId = 0;
    animTarget = null;
  }
}

/**
 * 功能：当鼠标位于两侧空白区域滚动时，
 * 将滚轮量以平滑动画的方式转发给中央的内容滚动区。
 */
function forwardWheelToContent(e: WheelEvent) {
  const wrapper = mainWrapper.value;
  const content = contentArea.value;
  if (!wrapper || !content) return;

  // 仅处理发生在两侧空白区域的滚轮事件（事件目标为外层容器本身）
  if (e.target !== wrapper) return;

  // 内容区没有可滚动内容时不拦截
  if (content.scrollHeight <= content.clientHeight) return;

  e.preventDefault();

  const dy = toPixels(e.deltaY, e.deltaMode, content.clientHeight);

  // 已经到达边界且继续向外滚 → 不启动动画，行为更接近原生
  const atTop = content.scrollTop <= 0 && dy < 0;
  const atBottom =
      content.scrollTop + content.clientHeight >= content.scrollHeight - 1 && dy > 0;
  if (atTop || atBottom) return;

  animTarget = content;
  pendingDelta += dy;

  if (!rafId) rafId = requestAnimationFrame(stepSmoothScroll);
}

onMounted(() => {
  mainWrapper.value?.addEventListener('wheel', forwardWheelToContent, { passive: false });
});

onBeforeUnmount(() => {
  mainWrapper.value?.removeEventListener('wheel', forwardWheelToContent);
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  animTarget = null;
  pendingDelta = 0;
  velocity = 0;
});
</script>
