<!-- Base64编解码页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">Base64编解码</h1>
    <p class="text-sm opacity-70 text-center">
      Base64是一种用64个可打印字符来表示二进制数据的编码方式，常用于在网络上传输原本为二进制的数据（如图片、文件或加密密钥）。
    </p>
    <Base64Codec/>
  </div>
</template>
<script lang="ts" setup>
import Base64Codec from '@/components/Codecs/Base64Codec';
</script>
