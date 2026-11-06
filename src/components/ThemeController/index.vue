<!-- 主题切换组件 -->
<template>
  <div role="radiogroup" class="p-1 gap-1 flex rounded-full border border-solid border-base-100">
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        :aria-checked="theme.mode === 'light'"
        class="btn btn-sm btn-ghost btn-circle"
        :class="theme.mode === 'light' ? 'btn-primary' : ''"
        title="切换到日间模式"
        @click="() => toggleTheme('light')"
    >
      <ThemeLight :tw-classes="[theme.mode === 'light' ? 'fill-primary-content' : 'fill-base-content']"/>
    </button>
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        :aria-checked="theme.mode === 'system'"
        class="btn btn-sm btn-ghost btn-circle"
        :class="theme.mode === 'system' ? 'btn-primary' : ''"
        title="跟随浏览器"
        @click="() => toggleTheme('system')"
    >
      <ThemeAuto :tw-classes="[theme.mode === 'system' ? 'fill-primary-content' : 'fill-base-content']"/>
    </button>
    <button
        type="button"
        role="radio"
        data-theme-switcher="true"
        :aria-checked="theme.mode === 'dark'"
        class="btn btn-sm btn-ghost btn-circle"
        :class="theme.mode === 'dark' ? 'btn-primary' : ''"
        title="切换到夜间模式"
        @click="() => toggleTheme('dark')"
    >
      <ThemeDark :tw-classes="[theme.mode === 'dark' ? 'fill-primary-content' : 'fill-base-content']"/>
    </button>
    <!-- 主题名称选择：与日/夜/自动按钮同组，点击展开下拉面板 -->
    <button
        ref="triggerRef"
        type="button"
        class="btn btn-sm btn-ghost btn-circle"
        :class="[themePanelOpen ? 'selected btn-primary' : '']"
        title="选择主题"
        aria-label="选择主题"
        :aria-expanded="themePanelOpen"
        @click.stop="themePanelOpen = !themePanelOpen"
    >
      <Theme :tw-classes="[themePanelOpen ? 'fill-primary-content' : 'fill-base-content']"/>
    </button>

    <!-- 下拉面板：Teleport 到 body + fixed 定位，彻底避免被头部 overflow 裁剪遮挡 -->
    <Teleport to="body">
      <div
          v-if="themePanelOpen"
          ref="panelRef"
          :style="floatingStyles"
          class="fixed z-max grid grid-cols-2 gap-x-2 p-3 pb-2 shadow-lg bg-base-100 rounded-box border border-base-300
          w-fit max-w-[calc(100vw-16px)] max-h-[75%] overflow-y-auto no-scrollbar"
          @click.stop
      >
        <!-- 日间主题列 -->
        <div class="flex flex-col items-start">
          <span class="text-xs font-bold opacity-60 mb-1 px-2 w-full text-center">日间</span>
          <button
              v-for="name in LIGHT_THEMES"
              :key="name"
              type="button"
              :data-theme="name"
              :title="`日间主题切换为${name}`"
              class="btn btn-sm btn-ghost btn-block justify-start normal-case hover:text-black"
              :class="[
                  theme.lightThemeName === name ? 'btn-active text-black' : '',
                  theme.mode === 'dark' ? 'text-white' : '',
                  ]"
              @click="changeTheme({ lightThemeName: name })"
          >
            <span class="size-3 rounded-full bg-primary shrink-0"></span>
            {{ name }}
          </button>
        </div>
        <!-- 夜间主题列 -->
        <div class="flex flex-col items-start">
          <span class="text-xs font-bold opacity-60 mb-1 px-2 w-full text-center">夜间</span>
          <button
              v-for="name in DARK_THEMES"
              :key="name"
              type="button"
              :data-theme="name"
              :title="`夜间主题切换为${name}`"
              class="btn btn-sm btn-ghost btn-block justify-start normal-case hover:text-white"
              :class="[
                  theme.darkThemeName === name ? 'btn-active text-white' : '',
                  theme.mode === 'dark' ? '' : 'text-black',
                  ]"
              @click="changeTheme({ darkThemeName: name })"
          >
            <span class="size-3 rounded-full bg-primary shrink-0"></span>
            {{ name }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { toRef, ref, watch, onMounted, onUnmounted } from 'vue';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';
import useSettingsStore from '@/stores/settingsStore';
import useAutoFavicon from '@/composables/useAutoFavicon.ts';
import ThemeAuto from '@/components/icons/ThemeAuto.vue';
import ThemeLight from '@/components/icons/ThemeLight.vue';
import ThemeDark from '@/components/icons/ThemeDark.vue';
import Theme from '@/components/icons/Theme.vue';

const LIGHT_THEMES = ['light', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'retro', 'cyberpunk', 'valentine', 'garden', 'lofi',
  'pastel', 'fantasy', 'wirefarame', 'cmyk', 'autumn', 'acid', 'lemonade', 'winter', 'nord', 'caramellatte', 'silk'];
const DARK_THEMES = ['dark', 'synthwave', 'halloween', 'forest', 'aqua', 'black', 'luxury', 'dracula', 'business', 'night',
  'coffee', 'dim', 'sunset', 'abyss']

const event = window.matchMedia("(prefers-color-scheme: dark)");
const { initTheme, toggleTheme, changeTheme } = useSettingsStore();
const theme = toRef(useSettingsStore(), 'theme');

/* ---------------- 主题下拉面板：开合 + 浮动定位（@floating-ui/vue） ---------------- */
const triggerRef = ref<HTMLElement>();
const panelRef = ref<HTMLElement>();
const themePanelOpen = ref(false);

// 面板挂到 body 上，用 floating-ui 自动定位到整组按钮下方、右缘对齐；
// 空间不足时自动翻转到上方，并随窗口尺寸/滚动自动更新，无需手写测量逻辑。
const { floatingStyles } = useFloating(triggerRef, panelRef, {
  placement: 'bottom',
  middleware: [offset(8), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
});
const closeThemePanel = () => themePanelOpen.value = false;
/** Esc 键关闭面板 */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeThemePanel();
};

watch(themePanelOpen, (open) => {
  if (open) {
    document.addEventListener('click', closeThemePanel);
    document.addEventListener('keydown', onKeydown);
  } else {
    document.removeEventListener('click', closeThemePanel);
    document.removeEventListener('keydown', onKeydown);
  }
});

const switchTheme = (_: Event) => toggleTheme();
onMounted(() => {
  initTheme();
  event.addEventListener('change', switchTheme);
  useAutoFavicon();
});

onUnmounted(() => {
  event.removeEventListener('change', switchTheme);
  document.removeEventListener('click', closeThemePanel);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<style lang="css" scoped>
.selected {
  background-color: color-mix(in oklab, var(--btn-color, var(--color-base-200)), #000 7%);
}
</style>
