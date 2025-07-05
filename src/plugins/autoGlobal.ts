import type { App } from 'vue';
import vSizeOb from '@/common/directs/sizeDirect';

/** 自定义插件，自动注册全局组件、指令、属性、方法 */
export default {
  install: (app: App) => {
    // 1. 注册全局组件
    // 注册自定义的图标
    const iconModules = import.meta.glob('@/components/icons/**/*.vue', {eager: true});
    Object.entries(iconModules).forEach(([path, module]) => {
      // 提取组件名：从路径截取文件名（不含扩展名）
      const fileName = path.replace('/src/components/icons/', '')
        .replace('/index.vue', '')
        .replace('.vue', '')
        .split('/').pop() || '';
      if (!fileName) return;
      // 使用 PascalCase 命名（首字母大写）
      const componentName = fileName.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
      console.log(componentName);
      // 全局注册组件
      app.component(componentName, (module as any).default);
    });

    // 2. 添加全局指令
    app.directive('v-size-ob', vSizeOb);

    // 3. 注入全局属性
    // app.config.globalProperties.$log = (msg: string) => console.log(msg);

    // 4. 使用 provide/inject
    // app.provide('pluginConfig', options);
  }
}
