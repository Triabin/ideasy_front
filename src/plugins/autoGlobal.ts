import type { App, DefineComponent, Directive } from 'vue';

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
      let name = path.replace('/src/common/directives/', '')
        .replace('/index.ts', '')
        .replace('.ts', '')
        .split('/')
        .pop();
      if (!name) return;
      // 转为短横线命名
      name = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2') // 小写字母/数字与大写字母之间用-连接
        // 所有大写字母之间用-连接
        .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
        // 所有下划线替换为-
        .replace(/_/g, '-')
        // 如果以v-开头，则自动去除
        .replace(/^v-/, '')
        // 转为小写
        .toLowerCase();
      // 判断是否重复注册
      if (app.directive(name)) throw new Error(`已存在名为“${name}”的指令，全局注册失败，请检查指令名是否重复，当前指令路径：${path}`);
      // 全局注册指令
      app.directive(name, directive);
    });

    // 3. 注入全局属性
    // app.config.globalProperties.$log = (msg: string) => console.log(msg);

    // 4. 使用 provide/inject
    // app.provide('pluginConfig', options);

    // 5. 注册全局方法
    /**
     * 函数描述：时间格式化工具
     * @param format { string } 格式（y-年，M-月，d-日，H-时[24]，h-时[12]，m-分，s-秒，S-毫秒(3位数)，q-季度，ap，午前am/午后pm）
     * @returns { string } 格式化后的字符串
     */
    Date.prototype.format = function (format: string = 'yyyy-MM-dd HH:mm:ss'): string {
      let o: { [key: string]: number | string } = {
        'M+': this.getMonth() + 1, // 月份
        'd+': this.getDate(), // 日
        'H+': this.getHours(), // 时（24小时制）
        'h+': this.getHours() % 12 === 0 ? 12 : this.getHours() % 12, // 时（12小时制）
        'm+': this.getMinutes(), // 分
        's+': this.getSeconds(), // 秒
        'q+': Math.floor((this.getMonth() + 3) / 3), // 季度
        'S': this.getMilliseconds(), // 毫秒
        'ap': this.getHours() > 12 ? 'am' : 'pm'
      };
      let week = ['日', '一', '二', '三', '四', '五', '六'];
      if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length));
      }
      if (/(E+)/.test(format)) {
        format = format.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? '星期' : '周') : '') + week[this.getDay()]);
      }
      for (let k in o) {
        let el = o[k];
        if (new RegExp('(' + k + ')').test(format)) {
          // 原代码中 el 类型为 string | number，而 replace 方法的第二个参数期望是一个函数或字符串，这里将 el 转换为字符串
          // 同时使用 match 方法替代已弃用的 RegExp.$1，使用 slice 方法替代已弃用的 substr
          const matchResult = format.match(new RegExp('(' + k + ')'));
          if (matchResult) {
            const matchedStr = matchResult[1];
            const formattedEl = typeof el === 'number' ? el.toString() : el;
            format = format.replace(
              matchedStr,
              matchedStr.length === 1 ? formattedEl : ('00' + formattedEl).slice(-matchedStr.length)
            );
          }
        }
      }
      return format;
    }
  }
}
