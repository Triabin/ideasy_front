import { useTemplateRef, onMounted, onBeforeUnmount } from 'vue';

/**
 * 鼠标在外部元素区域滚动时，内部元素同步滚动
 * @param outerElement 外部元素对象
 * @param innerElement 内部元素对象
 */
const useWheelOuter2Inner = (
  outerElement: ReturnType<typeof useTemplateRef<HTMLElement>>,
  innerElement: ReturnType<typeof useTemplateRef<HTMLElement>>
) => {
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
  const toPixels = (delta: number, deltaMode: number, viewportH: number): number => {
    if (deltaMode === 1) return delta * 16;          // DOM_DELTA_LINE
    if (deltaMode === 2) return delta * viewportH;   // DOM_DELTA_PAGE
    return delta;                                    // DOM_DELTA_PIXEL
  }

  /** 逐帧驱动滚动：速度平滑追踪 + 惯性衰减 */
  const stepSmoothScroll = () => {
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

  /** 功能：当鼠标位于两侧空白区域滚动时，将滚轮量以平滑动画的方式转发给中央的内容滚动区。 */
  const forwardWheelToContent = (e: WheelEvent) => {
    const wrapper = outerElement.value;
    const content = innerElement.value;
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

  onMounted(() => outerElement.value?.addEventListener('wheel', forwardWheelToContent, { passive: false }));

  onBeforeUnmount(() => {
    outerElement.value?.removeEventListener('wheel', forwardWheelToContent);
    rafId && cancelAnimationFrame(rafId);
    rafId = 0;
    animTarget = null;
    pendingDelta = 0;
    velocity = 0;
  });
}

export default useWheelOuter2Inner;
