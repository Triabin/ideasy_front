<!-- 字体预览 -->
<template>
  <div class="h-full w-full max-h-full max-w-full">
    <h1 class="w-full text-center text-3xl mt-4">字体预览</h1>
    <p>将字体文件拖动到此页面或者点击上传按钮，然后输入预览内容即可，最多支持上传20中字体。</p>
    <div class="w-full bg-base-200 rounded-2xl">

    </div>
  </div>
</template>
<script lang="ts" setup>
import {ref} from 'vue';

const previewText = ref<string>("");
const fonts = ref<Blob[]>([]);
</script>
<style lang="css" scoped>

</style>
