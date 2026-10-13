<!-- 字体预览 -->
<template>
  <div class="p-4 flex flex-col gap-3">
    <h1 class="w-full text-center text-3xl mt-4">字体预览</h1>
    <p class="text-sm opacity-70">将字体文件拖动到此页面或者点击上传按钮，然后输入预览内容即可，最多支持上传{{ maxCount }}种字体。</p>

    <!-- 上传区域：拖拽 + 点击选择 -->
    <div
        class="w-full bg-base-200 rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 py-8 px-4"
        :class="dragOver ? 'border-primary bg-base-300' : 'border-base-300'"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
        @click="fileInputRef?.click()"
    >
      <Font class="w-10 h-10 opacity-60"/>
      <span>将字体文件（.ttf / .otf / .woff / .woff2）拖到此处，或点击选择文件</span>
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
    <UnderLineMsg ref="msgRef"/>

    <!-- 已上传字体列表 -->
    <div v-if="fonts.length" class="flex flex-wrap gap-2">
      <div v-for="font in fonts" :key="font.id" class="badge badge-lg gap-1 badge-outline">
        <span :style="{ fontFamily: `'${font.family}'` }">{{ font.name }}</span>
        <button class="cursor-pointer hover:text-error" title="移除该字体" @click.stop="removeFont(font.id)">✕</button>
      </div>
    </div>

    <!-- 预览参数 -->
    <div class="flex flex-wrap items-center gap-4">
      <label class="input input-sm w-52 items-center gap-2">
        字号
        <input type="number" min="8" max="200" class="grow" v-model.number="fontSize"/> px
      </label>
      <label class="input input-sm w-52 items-center gap-2">
        行高
        <input type="number" min="1" max="3" step="0.1" class="grow" v-model.number="lineHeight"/>
      </label>
      <label v-if="theme === 'light'" class="label">
        <input type="checkbox" class="toggle" v-model="darkBg"/>
        深色背景
      </label>
      <button v-if="fonts.length" class="btn btn-sm btn-error btn-outline ml-auto" @click="clearAllFonts">清空全部字体</button>
    </div>

    <!-- 预览文本输入 -->
    <textarea
        v-model="previewText"
        rows="3"
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
          :key="font.id"
          class="card shadow-sm"
          :class="darkBg ? 'bg-neutral text-neutral-content' : 'bg-base-200'"
      >
        <div class="card-body gap-1 overflow-hidden">
          <h2 class="card-title text-base truncate">{{ font.name }}</h2>
          <i class="text-xs opacity-60">家族名：{{ font.family }} · 大小：{{ formatSize(font.size) }}</i>
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
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue';
import useSettingsStore from '@/stores/settingsStore';
import UnderLineMsg from '@/components/UnderLineMsg';
import Font from '@/components/icons/Font.vue';

/** 已加载的字体信息 */
type LoadedFont = {
  id: number; // 唯一标识
  name: string; // 文件名
  family: string; // FontFace 注册的家族名
  size: number; // 文件大小（字节）
  url: string; // ObjectURL，用于卸载时释放
  face: FontFace; // 字体对象
};

const defaultPreviewText = '永字八法 AaBbGg 0123456789\nThe quick brown fox jumps over the lazy dog.\n天地玄黄 宇宙洪荒 日月盈昃 辰宿列张';
const maxCount = 20; // 最多支持的字体数量

const previewText = ref<string>('');
const fonts = ref<LoadedFont[]>([]);
const fontSize = ref<number>(32);
const lineHeight = ref<number>(1.5);
const darkBg = ref<boolean>(false);
const dragOver = ref<boolean>(false);
const fileInputRef = ref<HTMLInputElement>();
const msgRef = ref<any>();
const theme = toRef(useSettingsStore(), 'currRealMode');

watch(theme, (mode) => {
  if (mode === 'dark') {
    darkBg.value = false;
  }
});

let fontIdSeed = 0;

/**
 * TS 内置 lib.dom.d.ts 中 FontFaceSet 类型未声明 add/delete 方法（浏览器实际支持），此处做类型补充
 */
const fontSet = document.fonts as FontFaceSet & {
  add(fontface: FontFace): void;
  delete(fontface: FontFace): void;
};

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
});

/**
 * 格式化文件大小
 * @param bytes {number} 字节数
 */
const formatSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

/**
 * 函数描述：处理用户选择的字体文件（点击或拖拽入口共用）
 * @param files {FileList | null} 文件列表
 */
const handleFiles = async (files: FileList | null) => {
  if (!files || !files.length) return;
  const list = Array.from(files);
  for (const file of list) {
    if (fonts.value.length >= maxCount) {
      msgRef.value?.showMsg(`最多支持上传${maxCount}种字体，剩余文件已忽略`, 'warning');
      break;
    }
    if (fonts.value.some(f => f.name === file.name && f.size === file.size)) {
      msgRef.value?.showMsg(`字体“${file.name}”已存在，已跳过`, 'warning');
      continue;
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
  const family = `ideasy-font-${++fontIdSeed}`;
  try {
    const face = new FontFace(family, `url(${url})`);
    await face.load();
    fontSet.add(face);
    fonts.value.push({ id: fontIdSeed, name: file.name, family, size: file.size, url, face });
    msgRef.value?.showMsg(`字体“${file.name}”加载成功`, 'success', 2000);
  } catch (e) {
    URL.revokeObjectURL(url);
    msgRef.value?.showMsg(`字体“${file.name}”加载失败，请确认文件是否为有效字体`, 'fail');
  }
};

/**
 * 函数描述：移除指定字体并释放资源
 * @param id {number} 字体id
 */
const removeFont = (id: number) => {
  const index = fonts.value.findIndex(f => f.id === id);
  if (index === -1) return;
  const font = fonts.value[index];
  fontSet.delete(font.face);
  URL.revokeObjectURL(font.url);
  fonts.value.splice(index, 1);
};

/** 清空全部字体 */
const clearAllFonts = () => {
  [...fonts.value].forEach(f => removeFont(f.id));
  msgRef.value?.showMsg('已清空全部字体', 'info', 2000);
};

/** input[type=file] change 回调 */
const onFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  void handleFiles(input.files);
  input.value = ''; // 允许重复选择同一文件
};

/** 拖拽释放回调 */
const onDrop = (e: DragEvent) => {
  dragOver.value = false;
  void handleFiles(e.dataTransfer?.files ?? null);
};

onBeforeUnmount(() => {
  // 组件销毁时释放字体与URL资源
  fonts.value.forEach(f => {
    fontSet.delete(f.face);
    URL.revokeObjectURL(f.url);
  });
});
</script>
