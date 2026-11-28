import { nextTick, onUnmounted, watch, type ShallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * 路由切换时的滚动位置策略：
 * - 浏览器前进/后退：恢复到该页面离开前的 scrollTop；
 * - 其它导航（push/replace）：回到顶部。
 * 滚动容器是跨路由常驻的元素，不处理会把旧页面的位置带到新页面（新页面较矮时还会被钳制到底部）。
 * @param elRef 内容区元素的 ref，用于读取/设置 scrollTop
 */
const useScrollRestoration = (elRef: Readonly<ShallowRef<HTMLElement | null>>) => {
  const route = useRoute();
  const router = useRouter();
  /** 各页面离开时的 scrollTop，键为 fullPath（含 query / hash） */
  const scrollPositions = new Map<string, number>();
  /** 本次导航要恢复到的位置：仅前进/后退会由 history listener 预先写入 */
  let pendingRestoreTop: number | null = null;
  /** 消费后的恢复目标，供 watch 使用 */
  let restoreTop = 0;

  /**
   * 必须监听 router history 而非 window 的 popstate：
   * window 监听器注册晚于 Vue Router，且浏览器会在各监听器之间清空微任务队列，
   * 等它触发时路由导航已经结束，标记来不及生效。
   */
  const stopHistoryListener = router.options.history.listen((fullPath) => pendingRestoreTop = scrollPositions.get(fullPath) ?? 0);

  const removeScrollGuard = router.beforeEach((_, from) => {
    // 此刻内容区渲染的还是旧页面，scrollTop 有效
    if (from.matched.length) scrollPositions.set(from.fullPath, elRef.value?.scrollTop ?? 0);
    // 每次导航都重新判定：非前进/后退一律归零，
    // 这样上一次被取消的前进/后退留下的值会被自动清掉，不会污染下一次普通跳转
    restoreTop = pendingRestoreTop ?? 0;
    pendingRestoreTop = null;
  });

  watch(() => route.fullPath, async () => {
    // 等新页面渲染完成再滚动，否则恢复的位置会被旧页面高度钳制
    await nextTick();
    elRef.value?.scrollTo({ top: restoreTop });
  });

  onUnmounted(() => {
    stopHistoryListener();
    removeScrollGuard();
  });
};

export default useScrollRestoration;
