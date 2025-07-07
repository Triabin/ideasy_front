import type { Directive, DirectiveBinding } from 'vue';

// 存储元素与回调的映射（WeakUp防止内存泄漏
const observerMap = new WeakMap<HTMLElement, (size: { width: number, height: number }) => void>();
const ob = new ResizeObserver(entries => entries.forEach(entry => {
    const handler = observerMap.get(entry.target as HTMLElement);
    const box = entry.borderBoxSize?.[0] || entry.contentRect;
    handler && handler({
      width: box.inlineSize,
      height: box.blockSize
    })
}));

const vSizeOb: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    // 类型校验，取保绑定的值时函数
    if (typeof binding.value!== 'function') {
      throw new Error('v-size-ob指令需要接收一个回调函数');
    }
    observerMap.set(el, binding.value);
    ob.observe(el);
  },
  unmounted(el: HTMLElement) {
    ob.unobserve(el);
    observerMap.delete(el);
  }
}

export default vSizeOb;
