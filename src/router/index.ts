/**
 * 按照目录../views下子路径的目录层级生成路由，例如../views/Home目录下，有一个index.vue和一个_page.ts文件，
 * index.vue为Home页面内容，_page.ts默认到处一个JSON对象，该对象内容为路由的meta字段值，生成的路由为/home，
 * 路由名称为Home。如果Home还有其他子路径，则生成规则相同，只不过路由前面都有/home/
 * 特殊说明：路由 / 重定向到 /home
 */
import { createRouter, createWebHistory, type RouteMeta, type RouteRecordRaw } from 'vue-router';
import { setupRouteAnalytics } from '@/plugins/analytics.ts';
import useAppDataStore from '@/stores/appData';

/** 存放路由信息的模型 */
type _GenRouteModel = {
  path: string;
  name?: string;
  component?: () => Promise<unknown>;
  meta?: RouteMeta;
  children?: Map<string, _GenRouteModel>
}

// 存放构建路由所需信息，使用Map方便子路由构建
const modelMap: Map<string, _GenRouteModel> = new Map();
// 1. 获取页面meta信息
const pages: Record<string, RouteMeta> = import.meta.glob('../views/**/_page.ts', {
  eager: true,
  import: 'default'
});
// 2. 获取路由页面对应组件(不能使用pages中的key直接获取，打包后生产环境中的值不一样)
const components = import.meta.glob('../views/**/index.vue');
// 3. 通过文件信息和导出的路由信息，将生成的路由信息存入Map中
Object.entries(pages).forEach(([path, meta]) => {
  // 生成组件引用路径
  const compPath = path.replace('_page.ts', 'index.vue');
  // 获取路由名称
  const routeName = path.replace('../views/', '').replace('/_page.ts', '')
    .split('/')
    .filter(Boolean)
    .pop();
  // 获取路径并转为短横线命名
  const urlPath = path.replace('../views/', '').replace('/_page.ts', '')
    // 小写字母/数字与大写字母之间用-连接
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    // 所有大写字母之间用-连接
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
    // 所有下划线替换为-
    .replace(/_/g, '-')
    // 转为小写
    .toLowerCase();
  const model = getModel(urlPath);
  if (!model) return;
  model.component = components[compPath];
  model.name = routeName;
  model.meta = meta;
});

// 4. 将路由信息转为路由对象
const routes: RouteRecordRaw[] = mapToRoutes(modelMap) || [];
// 5. 根目录重定向
routes.push({
  path: '/',
  redirect: '/home'
});
// 6. 排序
sortRoute(routes);
// 7. 构建路由
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});
// 8. 全局后置钩子
let pushRecentTool: (path: string) => void;
router.afterEach((to, from, next) => {
  // 向百度统计和微软Clarity报告页面访问信息
  setupRouteAnalytics(to);
  // 记录最近使用的工具
  if (to?.matched?.length && to?.fullPath.startsWith('/tools/')) {
    if (!pushRecentTool) {
      pushRecentTool = useAppDataStore().pushRecentTool;
    }
    pushRecentTool && pushRecentTool(to.fullPath);
  }
});
// 9. 导出路由
export default router;
export { routes, flattenRoute };

/**
 * 利用Map通过路劲信息获取路由所需信息（不存在则创建）
 * @param paths {string} 文件路劲
 */
function getModel(paths: string): _GenRouteModel | undefined {
  let currModel: _GenRouteModel | undefined;
  paths && paths.split('/').forEach((path, index) => {
    if (index === 0 && !path.startsWith('/')) {
      path = `/${path}`;
    }
    if (index !== 0 && path.startsWith('/')) {
      path = path.slice(1);
    }
    let temp: _GenRouteModel | undefined;
    if (!currModel) {
      temp = modelMap.get(path);
      if (!temp) {
        temp = { path };
        modelMap.set(path, temp);
      }
    } else {
      if (!currModel.children) {
        currModel.children = new Map();
      }
      temp = currModel.children.get(path);
      if (!temp) {
        temp = { path };
        currModel.children.set(path, temp);
      }
    }
    currModel = temp;
  });

  return currModel;
}

/**
 * 将生成的路由数据转为路由
 * @param modelMap {Map<string, _GenRouteModel>} 生成的路由信息
 */
function mapToRoutes(modelMap: Map<string, _GenRouteModel> | undefined): RouteRecordRaw[] | undefined {
  if (!modelMap) return undefined;
  const routes: RouteRecordRaw[] = [];
  modelMap.forEach((model, key) => {
    // @ts-ignore
    const route: RouteRecordRaw = {
      path: key,
      name: model.name,
      component: model.component,
      meta: model.meta,
      children: mapToRoutes(model.children)
    };
    routes.push(route);
  });
  return routes;
}

/**
 * 根据所提供的参数排序
 * @param routes {RouteRecordRaw[]} 路由
 */
function sortRoute(routes: RouteRecordRaw[]) {
  routes.sort((r1, r2): number => {
    const wight1 = r1.meta?.menuOrder;
    const wight2 = r2.meta?.menuOrder;
    if (wight1 === undefined && wight2 === undefined) {
      return 0;
    } else if (wight1 === undefined) {
      return 1;
    } else if (wight2 === undefined) {
      return -1;
    }
    return (wight1 as number) - (wight2 as number);
  });

  routes.forEach(route => {
    if (route.children) {
      sortRoute(route.children);
    }
  });
}

/**
 * 将路由扁平化
 * @param routes {RouteRecordRaw[]} 路由
 * @param parentPath {string} 父路由路径
 * @returns {RouteRecordRaw[]} 扁平化的路由
 */
function flattenRoute(routes: RouteRecordRaw[], parentPath: string = ''): RouteRecordRaw[] {
  if (!routes) return [];
  let result: RouteRecordRaw[] = [];
  routes.forEach(route => {
    let currPath = (route.path.startsWith('/') || parentPath.endsWith('/')) ? parentPath + route.path : `${parentPath}/${route.path}`;
    if (route.path.startsWith('/') && parentPath.endsWith('/')) currPath = currPath.replace('//', '/');
    if (route.children && route.children.length > 0) {
      let children = flattenRoute(route.children, currPath);
      children && children.length && result.push(...children);
    }
    // @ts-ignore
    result.push({
      ...route,
      path: currPath,
      children: undefined
    });
  });
  return result;
}
