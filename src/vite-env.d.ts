/// <reference types="vite/client" />

// 声明以@开头的所有路径
declare module '@/*' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ViteTypeOptions {
  // 添加这行代码，你就可以将 ImportMetaEnv 的类型设为严格模式，
  // 这样就不允许有未知的键值了。
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Date {
  /**
   * 函数描述：时间格式化工具
   * @param format { string } 格式：y-年，M-月，d-日，H-时[24]，h-时[12]，m-分，s-秒，S-毫秒，q/Q-季度，ap/AP-am/pm（配合h使用），E/e-星期，Z-时区。
   * 特殊格式说明：
   * ① 表示5月时，M=>5、MM=>05，时分秒毫秒和日同理，匹配字符数量为真实值最小长度，不足时用0补足。
   * ② 年份y匹配字符长度为2时，取最后两位，其余时候同①。
   * ③ 星期：E => 一~六与日、EE => 周*、EEE => 星期*；e => 英文简写、ee => 英文简写（末尾带“.”）、eee => 英文星期。
   * ④ 季度q为大写Q时，返回汉字“一~四”；ap为大写时，返回的上/下午为大写字母。
   * @returns { string } 格式化后的字符串
   */
  format(format: string = 'yyyy-MM-dd HH:mm:ss'): string;
}

interface Window {
  _hmt?: any[] // 百度统计
  clarity?: (...args: any[]) => void // 微软 Clarity
}

interface Window {
  queryLocalFonts(): Promise<FontData[]>;
}
interface FontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob(): Promise<Blob>;
}
