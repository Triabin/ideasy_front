import {createRouter, createWebHashHistory, type RouteRecordRaw} from 'vue-router';

type Meta = {
  title: string,
  icon?: string,
  menuOrder?: number
}

const pages: Record<string, Meta> = import.meta.glob('../views/**/_page.ts', {
  eager: true,
  import: 'default'
});
// 获取路由页面对应组件(不能使用pages中的key直接获取，打包后生产环境中的值不一样)
const components = import.meta.glob('../views/**/index.vue');

const routes: RouteRecordRaw[] = Object.entries(pages).map(([path, meta]) => {
  const compPath = path.replace('_page.ts', 'index.vue');
  path = path.replace('../views', '').replace('/_page.ts', '').toLowerCase();
  const name = path.split('/').filter(Boolean).join('-') || 'home';
  const component = components[compPath];
  return { path, name, component, meta };
});
routes.push({
  path: '/',
  redirect: '/home'
});

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
export { routes };
