import { createRouter, createWebHashHistory, type RouteMeta, type RouteRecordRaw } from 'vue-router';

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
  const compPath = path.replace('_page.ts', 'index.vue');
  // 获取路径并转为短横线命名
  path = path.replace('../views/', '').replace('/_page.ts', '')
    // 小写字母/数字与大写字母之间用-连接
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    // 所有大写字母之间用-连接
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
    // 所有下划线替换为-
    .replace(/_/g, '-')
    // 转为小写
    .toLowerCase();
  const model = getModel(path);
  if (!model) return;
  model.component = components[compPath];
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
  history: createWebHashHistory(),
  routes
});
// 8. 导出路由
export default router;
export { routes };

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
