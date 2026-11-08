<!-- URL编解码页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">URL编解码</h1>
    <p class="text-sm opacity-70 text-center">
      URL编解码（URL Encoding/Decoding，也常被称为百分号编码/Percent-encoding）是互联网上用于规范化传输数据的机制。
    </p>
    <URLCodec/>
  </div>
</template>
<script lang="ts" setup>
import URLCodec from '@/components/Codecs/URLCodec';
</script>
