<!-- Unicode转义页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">Unicode转义</h1>
    <p class="text-sm opacity-70 text-center">
      Unicode转义（Unicode Escaping）将中文、emoji 等非 ASCII 字符表示为 \uXXXX 等纯 ASCII 转义序列，
      常用于 JSON、Java/JS 源码、HTML 实体与国际化资源文件等场景。
    </p>
    <UnicodeEsc/>
  </div>
</template>
<script lang="ts" setup>
import UnicodeEsc from '@/components/Codecs/UnicodeEsc';
</script>
