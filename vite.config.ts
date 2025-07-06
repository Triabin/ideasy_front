import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

// 当前执行node命令时文件夹的地址（工作目录）
const root: string = process.cwd();
// 路径拼接函数，简化代码
const pathResolve = (path: string): string => resolve(root, path);

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],

  resolve: {
    alias: [
      /** 设置@指向src目录 */
      { find: '@', replacement: pathResolve('src') }
    ],
    extensions: ['.vue', '.css', '.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },

  server: {
    host: '0.0.0.0',
    port: 3000,
  }
});
