import type {App, DefineComponent, Directive} from 'vue';
import vSizeOb from '@/common/directs/vSizeOb';

/** 自定义插件，自动注册全局组件、指令、属性、方法 */
export default {
  install: (app: App) => {
    // 说明：import.meta.glob的glob参数必须为静态字符串，不能使用变量，否则Vite 在开发阶段的按需编译机制会无法预解析路径，导致模块加载失败
    // 1. 注册全局组件
    // 注册自定义的图标
    const iconComponents: Record<string, DefineComponent> = import.meta.glob('@/components/icons/**/*.vue', {
      eager: true,
      import: 'default'
    });
    Object.entries(iconComponents).forEach(([path, component]) => {
      // 提取组件名：从路径截取文件名（不含扩展名）
      const name = path.replace('/src/components/icons/', '')
        .replace('/index.vue', '')
        .replace('.vue', '')
        .split('/')
        .pop();
      if (!name) return;
      // 判断是否重复注册
      if (app.component(name)) throw new Error(`已存在名为“${name}”的组件，全局注册失败，请检查组件名是否重复，当前组件路径：${path}`);
      // 全局注册组件
      app.component(name, component);
    });

    // 2. 添加全局指令
    const directives: Record<string, Directive> = import.meta.glob('@/common/directives/**/*.ts', {
      eager: true,
      import: 'default'
    });
    Object.entries(directives).forEach(([path, directive]) => {
      const name = path.replace('/src/common/directives/', '')
        .replace('/index.ts', '')
        .replace('.ts', '')
        .split('/')
        .pop();
      if (!name) return;
      // 转为短横线命名
      const directiveName = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2') // 小写字母/数字与大写字母之间用-连接
        .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2') // 所有大写字母之间用-连接
        .replace(/_/g, '-') // 所有下划线替换为-
        .toLowerCase();
      // 判断是否重复注册
      if (app.directive(directiveName)) throw new Error(`已存在名为“${directiveName}”的指令，全局注册失败，请检查指令名是否重复，当前指令路径：${path}`);
      // 全局注册指令
      app.directive(directiveName, vSizeOb);
    });

    // 3. 注入全局属性
    // app.config.globalProperties.$log = (msg: string) => console.log(msg);

    // 4. 使用 provide/inject
    // app.provide('pluginConfig', options);
  }
}
