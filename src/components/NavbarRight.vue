<!-- 导航栏右侧：桌面端展示全部入口；移动端只保留搜索、主题快速切换与抽屉入口，其余收进抽屉 -->
<template>
  <!-- 全局搜索：组件内部自适应，桌面端为伪输入框、移动端为图标按钮 -->
  <GlobalSearch/>
  <!-- 博客（md 及以上显示，移动端收进抽屉） -->
  <div title="我的博客"
       class="hidden md:flex gap-1 items-center cursor-pointer"
       @click="openUrl('https://spirit.triabin.cn')">
    <img src="https://spirit.triabin.cn/icons/favicon.png" alt="spirit-favicon" class="size-6"/>
    <span class="text-sm whitespace-nowrap">博客</span>
  </div>
  <!-- 主题按钮组（md 及以上显示；移动端的完整主题设定收在抽屉里） -->
  <div class="hidden md:flex">
    <ThemeController/>
  </div>
  <!-- 主题快速切换（仅移动端）：一键在日间/夜间模式之间切换 -->
  <button
      type="button"
      class="btn btn-sm btn-ghost btn-circle md:hidden"
      :title="currRealMode === 'dark' ? '切换到日间模式' : '切换到夜间模式'"
      :aria-label="currRealMode === 'dark' ? '切换到日间模式' : '切换到夜间模式'"
      @click="toggleTheme(currRealMode === 'dark' ? 'light' : 'dark')">
    <ThemeLight v-if="currRealMode === 'dark'" :size="18"/>
    <ThemeDark v-else :size="18"/>
  </button>
  <span class="hidden md:inline text-gray-500 cursor-default">||</span>
  <!-- GitHub（md 及以上显示，移动端收进抽屉） -->
  <div
      title="访问GitHub仓库"
      class="hidden md:block cursor-pointer"
      @click="openUrl('https://github.com/Triabin/ideasy_front')">
    <GitHub :size="24"/>
  </div>
  <!-- 抽屉入口（仅移动端）：label 关联 App.vue 中的 drawer checkbox -->
  <label for="nav-drawer" title="打开菜单" aria-label="打开菜单"
         class="btn btn-sm btn-ghost btn-circle md:hidden cursor-pointer">
    <MenuIcon :size="20"/>
  </label>
</template>

<script lang="ts" setup>
import { toRef } from 'vue';
import GlobalSearch from '@/components/GlobalSearch.vue';
import ThemeController from '@/components/ThemeController';
import GitHub from '@/components/icons/GitHub.vue';
import MenuIcon from '@/components/icons/Menu.vue';
import ThemeLight from '@/components/icons/ThemeLight.vue';
import ThemeDark from '@/components/icons/ThemeDark.vue';
import useSettingsStore from '@/stores/settingsStore';
import { openUrl } from '@/common/utils.ts';

const settingsStore = useSettingsStore();
/** 当前实际的明暗模式（跟随系统时即系统当前模式） */
const currRealMode = toRef(settingsStore, 'currRealMode');
const { toggleTheme } = settingsStore;
</script>
