import { type App } from 'vue';
import { type Router } from 'vue-router';

/** 百度统计站点 ID */
const BAIDU_TONGJI_ID = '29527bf0314d559f89405f0955c7ba30';
/** 微软 Clarity 项目 ID */
const CLARITY_PROJECT_ID = 'z1n48evaaa';
/** 正式部署域名 */
const PROD_HOSTNAME = 'ideasy.triabin.cn';
/** Clarity 异步队列函数类型：官方脚本加载完成前，调用先缓存在 q 中，加载后由其回放 */
type ClarityQueueFn = ((...args: any[]) => void) & { q?: unknown[][] };

const enabled = import.meta.env.PROD && location.hostname === PROD_HOSTNAME;
export default {
  install(_: App) {
    // 1、PROD 排除 pnpm dev；域名白名单排除本地 pnpm preview（它也是生产构建）
    if (!enabled) return;
    // 2、注入百度统计脚本
    const baiduTj = () => {
      window._hmt = window._hmt || [];
      const hm = document.createElement('script');
      hm.src = `https://hm.baidu.com/hm.js?${BAIDU_TONGJI_ID}`;
      document.head.appendChild(hm);
    };
    baiduTj();
    // 3、注入微软Clarity脚本
    const clarityAnalytic = () => {
      const queue: unknown[][] = [];
      const clarity = ((...args: any[]) => queue.push(args)) as ClarityQueueFn;
      clarity.q = queue;
      window.clarity = clarity;
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
      document.head.appendChild(script);
    };
    clarityAnalytic();
  }
}

export const setupRouteAnalytics = (router: Router) => {
  if (!enabled) return;
  const pathResolve = (path: string | undefined | null) => (!path || path === '/') ? '' : `/#${path}`;
  router.afterEach((to, from, next) => {
    // 1 百度统计：手动推送页面路径
    if (typeof window !== 'undefined' && window._hmt) {
      window._hmt?.push(['_trackPageview', pathResolve(to.fullPath)]);
    }
    // 2 微软 Clarity：Clarity 通常会自动监听 history.pushState，但为了保险起见，或者如果需要传递自定义数据，可以手动触发
    if (typeof window !== 'undefined' && window.clarity) {
      // 可选：给 Clarity 传递当前路由的名称或元数据，方便在后台筛选
      window.clarity('set', 'page_route', pathResolve(to.name?.toString() || to.path));
    }
  });
}
