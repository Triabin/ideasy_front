<!-- 字体预览 -->
<template>
  <div class="p-4 flex flex-col gap-3">
    <h1 class="w-full text-center text-3xl mt-4">字体预览</h1>
    <p class="text-sm opacity-70">将字体文件拖动到此页面或者点击上传按钮，也可以直接加载系统本地字体，然后输入预览内容即可，最多支持上传{{ maxCount }}种字体。</p>

    <!-- 上传区域：拖拽 + 点击选择 -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="grow bg-base-200 rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col
                  items-center justify-center gap-2 py-8 px-4 border-base-300"
           @click="fileInputRef?.click()"
      >
        <Font class="w-10 h-10 opacity-60"/>
        <span>将字体文件（.ttf / .otf / .woff / .woff2）拖到此处（或页面任意位置），或点击选择文件</span>
        <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            multiple
            accept=".ttf,.otf,.woff,.woff2,.ttc,font/*"
            @change="onFileInputChange"
            @click.stop
        />
      </div>

      <!-- 加载本地（系统）字体 -->
      <div class="flex flex-col gap-2 shrink-0" @click.stop>
        <button
            class="btn btn-primary btn-outline"
            :disabled="!localFontsSupported || loadingLocalFonts"
            @click="loadLocalFontList"
        >
          {{ loadingLocalFonts ? '读取中…' : '加载本地字体' }}
        </button>
        <!-- 可搜索的本地字体下拉选框 -->
        <div ref="fontPickerRef" class="relative">
          <input
              v-model="localFontKeyword"
              type="text"
              class="input input-sm input-bordered w-full"
              :placeholder="localFonts.length ? '搜索并选择本地字体' : '请先加载本地字体'"
              :disabled="!localFonts.length"
              @focus="showFontOptions = true"
              @keydown.down.prevent="moveActiveOption(1)"
              @keydown.up.prevent="moveActiveOption(-1)"
              @keydown.enter.prevent="chooseActiveOption()"
              @keydown.esc="showFontOptions = false"
          />
          <ul
              v-show="showFontOptions && localFonts.length"
              class="absolute z-20 mt-1 w-full min-w-72 max-w-[min(32rem,90vw)] max-h-60 overflow-y-auto rounded-lg border border-base-300 bg-base-100 shadow-lg"
          >
            <li
                v-for="(item, i) in filteredLocalFonts"
                :key="`${item.font.family}-${item.font.style}-${item.index}`"
                class="px-3 py-1.5 text-sm cursor-pointer break-all hover:bg-base-200"
                :class="{ 'bg-base-200 font-semibold': i === activeOptionIndex }"
                @mousedown.prevent="chooseOption(item.index)"
                @mouseenter="activeOptionIndex = i"
                :style="{ fontFamily: item.font.family }"
            >{{ item.font.fullName || item.font.family }}</li>
            <li v-if="!filteredLocalFonts.length" class="px-3 py-2 text-sm opacity-60">无匹配字体</li>
          </ul>
        </div>
        <i class="text-xs opacity-60">
          {{ localFontsSupported ? '通过Local Font Access API读取本机已安装字体，需授权。' : '当前浏览器不支持Local Font Access API' }}
        </i>
      </div>
    </div>

    <!-- 已上传字体列表 -->
    <div v-if="fonts.length" class="flex flex-wrap gap-2">
      <div v-for="font in fonts" :key="font.family" class="badge badge-lg gap-1 badge-outline cursor-pointer">
        <span class="italic text-base-content text-sm mr-2">{{ font.name }}<template v-if="font.local">（本地）</template></span>
        <button class="cursor-pointer hover:text-error" title="移除该字体" @click.stop="removeFont(font.family)">✕</button>
      </div>
    </div>

    <!-- 预览参数 -->
    <div class="flex flex-wrap items-center gap-4">
      <label class="input input-sm w-52 items-center gap-2">
        <span class="label">字号</span>
        <input type="number" min="8" max="200" class="grow" v-model.number="fontSize"/> px
      </label>
      <label class="input input-sm w-52 items-center gap-2">
        <span class="label">行高</span>
        <input type="number" min="1" max="3" step="0.1" class="grow" v-model.number="lineHeight"/>
      </label>
      <!-- 字体颜色 -->
      <div class="flex items-center gap-2">
        <label class="input input-sm flex items-center gap-2 cursor-pointer">
          <span class="label">字体颜色</span>
          <input type="color" class="w-9 h-8 p-0 rounded-md cursor-pointer bg-transparent"
                 v-model="fontColor" title="选择字体颜色"/>
        </label>
        <button class="btn btn-xs btn-ghost opacity-70" @click="fontColor = defaultFontColor" title="恢复默认字体颜色">默认</button>
      </div>
      <!-- 背景颜色 -->
      <div class="flex items-center gap-2">
        <label class="input input-sm flex items-center gap-2 cursor-pointer">
          <span class="label">背景颜色</span>
          <input type="color" class="w-9 h-8 p-0 rounded-md cursor-pointer bg-transparent"
                 v-model="bgColor" title="选择背景颜色"/>
        </label>
        <button class="btn btn-xs btn-ghost opacity-70" @click="resetBgColor" title="恢复默认背景颜色">默认</button>
      </div>
      <!-- 字体风格 -->
      <label class="select select-sm w-52">
        <span class="label">字体风格</span>
        <select v-model="fontStyle">
          <option value="normal">正常 normal</option>
          <option value="italic">斜体 italic</option>
          <option value="oblique">倾斜 oblique</option>
        </select>
      </label>
      <!-- 字重 -->
      <label class="select select-sm w-52">
        <span class="label">字重</span>
        <select v-model.number="fontWeight">
          <option :value="100">极细 100</option>
          <option :value="200">纤细 200</option>
          <option :value="300">轻量 300</option>
          <option :value="400">常规 400</option>
          <option :value="500">中等 500</option>
          <option :value="600">半粗 600</option>
          <option :value="700">加粗 700</option>
          <option :value="800">特粗 800</option>
          <option :value="900">黑体 900</option>
        </select>
      </label>
      <button v-if="fonts.length" class="btn btn-sm btn-error btn-outline ml-auto" @click="clearAllFonts">清空全部字体</button>
    </div>

    <!-- 低对比度建议提示：根据字体颜色提供可读的背景色，可一键应用 -->
    <div v-if="ifShowColorSuggestion" class="alert alert-warning py-2 flex-wrap gap-2">
      <span>当前字体颜色与背景颜色对比度过低，预览可能不清晰。建议背景色：</span>
      <button
          v-for="s in suggestions"
          :key="s.color"
          class="btn btn-xs border border-base-300"
          :style="{ backgroundColor: s.color, color: fontColor }"
          :title="`点击将背景设置为 ${s.color}`"
          @click="() => bgColor = s.color"
      >{{ s.label }}</button>
      <button class="btn btn-xs btn-primary btn-outline" @click="() => bgColor = suggestions[0].color">
        应用推荐值 {{ suggestions[0].color }}</button>
    </div>

    <!-- 预览文本输入 -->
    <textarea
        v-model="previewText"
        rows="6"
        class="textarea textarea-bordered w-full"
        placeholder="请输入要预览的文本内容"
    ></textarea>

    <!-- 预览结果 -->
    <div v-if="!fonts.length" class="rounded-2xl bg-base-200 p-6 text-center opacity-60">
      暂无字体，请先上传字体文件
    </div>
    <div v-else class="flex flex-col gap-3 pb-4">
      <div
          v-for="font in fonts"
          :key="font.family"
          class="card shadow-sm bg-base-200"
          :style="{ backgroundColor: cardBgColor, color: fontColor }"
      >
        <div class="card-body gap-1 overflow-hidden">
          <h2 class="card-title text-base truncate">{{ font.name }}</h2>
          <i class="text-xs opacity-60">家族名：{{ font.family }}<template v-if="font.size > 0"> · 大小：{{ MyFileUtils.fmtByteSize(font.size) }}</template></i>
          <div
              class="whitespace-pre-wrap break-all leading-none"
              :style="previewStyle(font.family)"
          >{{ displayText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, toRef, watch, useTemplateRef } from 'vue';
import { getFontFamilyFromFile, loadLocalFonts, MyFileUtils, popupTip } from '@/common/utils';
import useFullScreenDropFile from '@/common/useFullScreenDropFile.ts';
import useSettingsStore from '@/stores/settingsStore';
import Font from '@/components/icons/Font.vue';

/** 已加载的字体信息 */
type LoadedFont = {
  name: string; // 文件名（本地字体为“家族名 - 样式”）
  family: string; // FontFace 注册的家族名
  size: number; // 文件大小（字节），本地字体无法获取时为0
  url: string; // ObjectURL，用于卸载时释放；本地字体直接注册系统字体时为空
  local?: boolean; // 是否来自本地系统字体
};

const defaultPreviewText = '天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。（繁體：黃張）\nABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\n0123456789 *_-+`!@#$%^&()=';
const maxCount = 20; // 最多支持的字体数量

const previewText = ref<string>('');
const fonts = ref<LoadedFont[]>([]);
const fontSize = ref<number>(32);
const lineHeight = ref<number>(1.5);
const fontStyle = ref<string>('normal'); // 字体风格：normal / italic / oblique
const fontWeight = ref<number>(400); // 字重：100~900
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

/** 字体/背景颜色相关状态：默认值取页面实际渲染的主题色，保证昼夜主题下默认可视 */
const defaultFontColor = ref<string>('#000000');
const defaultBgColor = ref<string>('#ffffff');
const fontColor = ref<string>('#000000');
const bgColor = ref<string>('#ffffff');

/** 卡片实际背景色：未修改时保持主题类控制（class 提供底色），自定义后用内联样式覆盖 */
const cardBgColor = computed(() => (isDefaultColors.value ? undefined : bgColor.value));
/** 当前是否仍为默认颜色组合（是则交给主题 class 控制，避免内联固定色破坏主题） */
const isDefaultColors = computed(() => fontColor.value === defaultFontColor.value && bgColor.value === defaultBgColor.value);
/** 根据字体颜色计算满足对比度的建议背景色（黑/白 + 主题默认色） */
const suggestions = computed(() => {
  const list: { color: string; label: string }[] = [];
  const add = (color: string, label: string) => {
    if (contrastRatio(fontColor.value, color) >= 4.5 && !list.some(s => s.color.toLowerCase() === color.toLowerCase())) {
      list.push({ color, label });
    }
  };
  const dark = luminance(parseColor(fontColor.value) ?? [0, 0, 0]) > 0.5;
  add(dark ? '#000000' : '#ffffff', dark ? '黑色' : '白色');
  add(defaultBgColor.value, '主题默认');
  add(dark ? '#ffffff' : '#000000', dark ? '白色' : '黑色');
  return list;
});
/** 根据关键字过滤后的本地字体列表（保留原始索引以便添加），匹配家族名/全名/ PostScript 名，不区分大小写 */
const filteredLocalFonts = computed(() => {
  const kw = localFontKeyword.value.trim().toLowerCase();
  return localFonts.value
      .map((font, index) => ({ font, index }))
      .filter(({ font }) => !kw
          || font.family.toLowerCase().includes(kw)
          || (font.fullName ?? '').toLowerCase().includes(kw)
          || font.postscriptName.toLowerCase().includes(kw));
});
/** 是否显示颜色建议 */
const ifShowColorSuggestion = computed(() => contrastRatio(fontColor.value, bgColor.value) < 4.5);

/** 恢复背景默认颜色 */
const resetBgColor = () => {
  bgColor.value = defaultBgColor.value;
};

/** 解析 #rgb / #rrggbb / rgb() 为 0-255 通道 */
const parseColor = (c: string): [number, number, number] | null => {
  const hex = c.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let s = hex[1];
    if (s.length === 3) s = s.split('').map(ch => ch + ch).join('');
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  const rgb = c.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
};

/** rgb 字符串转十六进制（input[type=color] 需要 hex） */
const rgbToHex = (c: string): string => {
  const p = parseColor(c);
  return p ? `#${p.map(v => v.toString(16).padStart(2, '0')).join('')}` : c;
};

/** 读取页面真实渲染的 CSS 主题变量，作为默认颜色（随昼夜主题变化） */
const readThemeColors = () => {
  const probe = document.createElement('span');
  probe.className = 'bg-base-200 text-base-content';
  probe.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;width:0;height:0';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const bg = cs.backgroundColor;
  const fg = cs.color;
  probe.remove();
  return { bg: rgbToHex(bg), fg: rgbToHex(fg) };
};

/** 初始化/刷新默认颜色（主题切换后需重新同步，否则用户未改色时切主题会导致低对比度） */
const syncDefaultColors = () => {
  const { bg, fg } = readThemeColors();
  const prevDefFont = defaultFontColor.value;
  const prevDefBg = defaultBgColor.value;
  defaultFontColor.value = fg;
  defaultBgColor.value = bg;
  // 用户尚未手动改色时，跟随新主题更新当前颜色
  if (fontColor.value === prevDefFont) fontColor.value = fg;
  if (bgColor.value === prevDefBg) bgColor.value = bg;
};
syncDefaultColors();

/** WCAG 相对亮度 */
const luminance = ([r, g, b]: [number, number, number]) => {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/**
 * 计算两颜色的 WCAG 对比度（1~21）
 * @param a {string} 颜色1
 * @param b {string} 颜色2
 */
const contrastRatio = (a: string, b: string): number => {
  const pa = parseColor(a);
  const pb = parseColor(b);
  if (!pa || !pb) return 21; // 无法解析时不提示
  const [l1, l2] = [luminance(pa), luminance(pb)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/** 本地（系统）字体相关状态 */
const localFontsSupported = 'queryLocalFonts' in window; // Local Font Access API 支持检测
const localFonts = ref<FontData[]>([]);
const loadingLocalFonts = ref<boolean>(false);
// 可搜索下拉选框状态
const fontPickerRef = ref<HTMLDivElement>();
const localFontKeyword = ref<string>('');
const showFontOptions = ref<boolean>(false);
const activeOptionIndex = ref<number>(-1);

/** 关键字变化时重置高亮项并展开列表 */
watch(localFontKeyword, () => {
  activeOptionIndex.value = -1;
  showFontOptions.value = true;
});

/**
 * 函数描述：键盘上下键移动高亮选项，并滚动到可视区域
 * @param delta {number} 移动步长（1 或 -1）
 */
const moveActiveOption = (delta: number) => {
  const len = filteredLocalFonts.value.length;
  if (!len) return;
  showFontOptions.value = true;
  activeOptionIndex.value = Math.min(Math.max(activeOptionIndex.value + delta, 0), len - 1);
  fontPickerRef.value?.querySelectorAll('li')[activeOptionIndex.value]
      ?.scrollIntoView({ block: 'nearest' });
};

/**
 * 函数描述：添加指定索引的本地字体并重置搜索框
 * @param index {number} localFonts 列表下标
 */
const chooseOption = (index: number) => {
  // showFontOptions.value = false;
  void addLocalFont(index);
  // localFontKeyword.value = '';
  activeOptionIndex.value = -1;
};

/** 回车选择当前高亮项；若无高亮但只有一个匹配项则直接选择 */
const chooseActiveOption = () => {
  const list = filteredLocalFonts.value;
  if (!list.length) return;
  const target = activeOptionIndex.value >= 0 ? list[activeOptionIndex.value] : (list.length === 1 ? list[0] : undefined);
  if (target) chooseOption(target.index);
};

/** 点击选框外部时收起下拉列表 */
const onDocMouseDown = (e: MouseEvent) => {
  if (!fontPickerRef.value?.contains(e.target as Node)) showFontOptions.value = false;
};
document.addEventListener('mousedown', onDocMouseDown);

/** 昼夜主题切换后同步默认颜色：用户未手动改色时跟随新主题，保证默认可视 */
const settingsStore = useSettingsStore();
watch(toRef(settingsStore, 'currRealMode'), () => {
  // data-theme 由 store 更新到 html 上，等待下一帧样式生效后再读取渲染值
  requestAnimationFrame(() => syncDefaultColors());
});

/** 实际展示的预览文本 */
const displayText = computed(() => previewText.value.trim() || defaultPreviewText);

/**
 * 生成单个字体卡片的预览样式
 * @param family {string} 字体家族名
 */
const previewStyle = (family: string) => ({
  fontFamily: `'${family}', sans-serif`,
  fontSize: `${fontSize.value}px`,
  lineHeight: lineHeight.value,
  fontStyle: fontStyle.value as string,
  fontWeight: fontWeight.value,
});

/**
 * 函数描述：处理用户选择的字体文件（点击或拖拽入口共用）
 * @param files {FileList | null} 文件列表
 */
const handleFiles = async (files: FileList | null) => {
  if (!files || !files.length) return;
  const list = Array.from(files);
  for (const file of list) {
    if (fonts.value.length >= maxCount) {
      popupTip(`最多支持上传${maxCount}种字体，剩余文件已忽略`, { type: 'warning', duration: 2500 });
      break;
    }
    await addFont(file);
  }
};

/**
 * 函数描述：加载单个字体文件并注册为可预览字体
 * @param file {File} 字体文件
 */
const addFont = async (file: File) => {
  const url = URL.createObjectURL(file);
  const family = await getFontFamilyFromFile(file);
  if (fonts.value.findIndex(font => font.family === family) > -1) {
    popupTip(`已存在family为${family}的字体`, { type: 'warning', duration: 2500 });
    return;
  }
  try {
    fonts.value.push({ name: file.name, family, size: file.size, url });
    popupTip(`字体“${file.name}”加载成功`, { type: 'success', duration: 2000 });
  } catch (e) {
    console.error(e);
    popupTip(`字体“${file.name}”加载失败，请确认文件是否为有效字体`, { type: 'error' });
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * 函数描述：调用 Local Font Access API 读取本机已安装字体列表（loadLocalFonts 内部会触发浏览器权限弹窗与错误提示）
 */
const loadLocalFontList = async () => {
  if (loadingLocalFonts.value) return;
  loadingLocalFonts.value = true;
  try {
    localFonts.value = await loadLocalFonts() || [];
    popupTip(`读取到 ${localFonts.value.length} 个本地字体，请在下拉框中选择添加`, { type: 'success', duration: 2500 });
  } finally {
    loadingLocalFonts.value = false;
  }
};

/**
 * 函数描述：将指定索引的本地系统字体添加到预览列表
 * @param index {number} localFonts 列表下标
 */
const addLocalFont = async (index: number) => {
  if (index < 0 || index >= localFonts.value.length) return;
  if (fonts.value.length >= maxCount) {
    popupTip(`最多支持上传${maxCount}种字体`, { type: 'warning', duration: 2500 });
    return;
  }
  const lf = localFonts.value[index];
  const name = lf.fullName || lf.family;
  // 直接引用系统已安装字体注册 FontFace（local() 源），无需读取字体二进制数据
  const family = lf.family;
  const size = (await lf.blob()).size;
  if (fonts.value.findIndex(font => font.family === family) > -1) {
    popupTip(`已存在family为“${family}”的字体`, { type: 'warning', duration: 2500 });
    return;
  }
  try {
    fonts.value.push({ name, family, size, url: '', local: true });
    popupTip(`本地字体“${name}”添加成功`, { type: 'success', duration: 2000 });
  } catch (e) {
    console.error(e);
    popupTip(`本地字体“${name}”加载失败`, { type: 'error' });
  }
};

/**
 * 函数描述：移除指定字体并释放资源
 * @param family {string} 字体家族名
 */
const removeFont = (family: string) => {
  const index = fonts.value.findIndex(f => f.family === family);
  if (index === -1) return;
  const font = fonts.value[index];
  if (font.url) URL.revokeObjectURL(font.url);
  fonts.value.splice(index, 1);
};

/** 清空全部字体 */
const clearAllFonts = () => {
  [...fonts.value].forEach(f => removeFont(f.family));
  popupTip('已清空全部字体', { duration: 2000, type: 'info' });
};

/** input[type=file] change 回调（点击选择与全屏拖拽注入共用入口） */
const onFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  void handleFiles(input.files);
  input.value = ''; // 允许重复选择同一文件
};

useFullScreenDropFile(fileInputRef, {
  accept: ['.ttf', '.otf', '.woff', '.woff2', '.ttc', 'font/*'],
  maxSize: 30 * 1024 * 1024,
  maxCount,
  overlayText: `松开鼠标，添加字体文件（最多 ${maxCount} 种）`,
  onReject: (rejected, reason) => {
    if (reason === 'type') popupTip(`已忽略 ${rejected.length} 个非字体文件`, { type: 'warning', duration: 2500 });
    else if (reason === 'size') popupTip(`已忽略超过 30MB 的字体：${rejected.map(f => f.name).join('、')}`, { type: 'warning', duration: 2500});
  },
});

onBeforeUnmount(() => {
  // 组件销毁时移除全局监听并释放字体与URL资源
  document.removeEventListener('mousedown', onDocMouseDown);
  fonts.value.forEach(f => {
    f.url && URL.revokeObjectURL(f.url);
  });
});
</script>
