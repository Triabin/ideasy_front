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
     * @param format { string } 格式：y-年，M-月，d-日，H-时[24]，h-时[12]，m-分，s-秒，S-毫秒，q/Q-季度，ap/AP-am/pm（配合h使用），E/e-星期，Z-时区。
     * 特殊格式说明：
     * ① 表示5月时，M=>5、MM=>05，时分秒毫秒和日同理，匹配字符数量为真实值最小长度，不足时用0补足。
     * ② 年份y匹配字符长度为2时，取最后两位，其余时候同①。
     * ③ 星期：E => 一~六与日、EE => 周*、EEE => 星期*；e => 英文简写、ee => 英文简写（末尾带“.”）、eee => 英文星期。
     * ④ 季度q为大写Q时，返回汉字“一~四”；ap为大写时，返回的上/下午为大写字母。
     * ⑤ 需要原样输出的内容用方括号包裹，如 yyyy-MM-dd HH:mm:ss [GMT]Z => 2026-11-18 12:00:00 GMT+0800。
     * @returns { string } 格式化后的字符串
     */
    Date.prototype.format = function (format: string = 'yyyy-MM-dd HH:mm:ss'): string {
      const weeks = ['日', '一', '二', '三', '四', '五', '六'];
      const weeksEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weeksEnAbb = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const year = this.getFullYear();
      const week = this.getDay();
      const quarter = Math.ceil((this.getMonth() + 1) / 3);
      const zone = -this.getTimezoneOffset(); // 时区总偏移分钟数（东为正，支持半小时时区）
      const pad = (value: number, len: number) => String(value).padStart(len, '0');
      // 单次扫描替换，避免替换结果（如英文星期中的 s、am/pm 中的 m）被后续规则二次匹配
      return format.replace(/\[[^\]]*\]|y+|M+|d+|H+|h+|m+|s+|S+|q|Q|E+|e+|ap|AP|Z/g, (token) => {
        switch (token[0]) {
          // 方括号包裹的内容原样输出，用于 GMT 这类含格式符的字面量
          case '[': return token.slice(1, -1);
          // 年：y 与 yyyy 为四位，yy 取后两位，其余按匹配长度补零
          case 'y': return token.length === 1 ? pad(year, 4) : token.length === 2 ? String(year).slice(-2) : pad(year, token.length);
          case 'M': return pad(this.getMonth() + 1, token.length);
          case 'd': return pad(this.getDate(), token.length);
          case 'H': return pad(this.getHours(), token.length);
          case 'h': return pad(this.getHours() % 12 === 0 ? 12 : this.getHours() % 12, token.length);
          case 'm': return pad(this.getMinutes(), token.length);
          case 's': return pad(this.getSeconds(), token.length);
          case 'S': return pad(this.getMilliseconds(), token.length);
          case 'q': return String(quarter);
          case 'Q': return ['', '一', '二', '三', '四'][quarter];
          case 'a': return this.getHours() < 12 ? 'am' : 'pm';
          case 'A': return this.getHours() < 12 ? 'AM' : 'PM';
          case 'E': return token.length >= 3 ? `星期${weeks[week]}` : token.length === 2 ? `周${weeks[week]}` : weeks[week];
          case 'e': return token.length >= 3 ? weeksEn[week] : token.length === 2 ? `${weeksEnAbb[week]}.` : weeksEnAbb[week];
          case 'Z': return `${zone >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(zone) / 60), 2)}${pad(Math.abs(zone) % 60, 2)}`;
          default: return token;
        }
      });
    }
  }
}
