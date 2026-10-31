<!-- 字体子集功能页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">字体子集</h1>
    <p class="text-sm opacity-70">上传一个字体，输入指定内容，获取字体只包含指定内容的字体子集文件。</p>

    <!-- 上传区域：拖拽 + 点击选择 -->
    <div class="w-full bg-base-200 rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col
                items-center justify-center gap-2 py-8 px-4 border-base-300"
         @click="fileInputRef?.click()"
    >
      <FontIcon class="w-10 h-10 opacity-60"/>
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
    <button
        class="btn btn-primary"
        :class="[currFile ?? 'btn-disabled']"
        @click="download"
    >下载</button>
  </div>
</template>
<script lang="ts" setup>
import { useTemplateRef, ref } from 'vue';
import FontIcon from "@/components/icons/Font.vue";

const currFile = ref<File | undefined>();
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const onFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (files && files.length) {
    currFile.value = files[0];
  }
  input.value = '';
}
const download = async () => {
  if (!currFile.value) return;
}
</script>
