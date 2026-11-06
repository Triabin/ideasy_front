import { watch, toRef } from 'vue';
import useSettingsStore from '@/stores/settingsStore';

const useAutoFavicon = () => {
  const update = () => {
    // 1、获取管理favicon的link元素DOM对象（没有则创建）
    let link = document.querySelector<HTMLLinkElement>('link[data-favicon]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.setAttribute('data-favicon', '');
      document.head.appendChild(link);
    }
    // 2、获取DaisyUI当前主题的primary和primary-content两种颜色
    const styles = getComputedStyle(document.documentElement);
    // daisyUI 5
    let p = styles.getPropertyValue('--color-primary').trim();
    let pc = styles.getPropertyValue('--color-primary-content').trim();
    // daisyUI 4 / 旧版兜底：--p: 54% 20% 260% 形式
    if (!p) {
      const primary = styles.getPropertyValue('--p').trim(); // 类似 "54% 20% 260"
      p = primary ? `hsl(${primary})` : '#6366f1';
    }
    if (!pc) {
      const primaryContent = styles.getPropertyValue('--pc').trim();
      pc = primaryContent ? `hsl(${primaryContent})` : '#ffffff';
    }
    // 3、构建svg
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="24" fill="${p}"/>
      <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
            font-size="38" font-weight="700"
            font-family="'Yuanti SC', 'YouYuan', '汉仪润圆', '方正粗圆', ui-rounded, 'PingFang SC', 'Microsoft YaHei', 'HarmonyOS Sans SC', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei', system-ui, sans-serif;"
            fill="${pc}"
      >灵</text>
    </svg>`;
    // 4、将svg转为DataURL并应用到link上
    link.href = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  const theme = toRef(useSettingsStore(), 'theme');
  update();
  watch(() => [theme.value.mode, theme.value.darkThemeName, theme.value.lightThemeName], update);
}

export default useAutoFavicon;
