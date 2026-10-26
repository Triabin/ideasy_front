<!-- 编解码页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">编解码工具</h1>
    <p class="text-sm opacity-70 text-center">
      常用字符串编解码工具，包括Base64、URL编解码等。
    </p>

    <!-- 工具选择 -->
    <div class="flex flex-wrap justify-center gap-2">
      <button
          v-for="codec in codecs"
          :key="codec.id"
          class="btn btn-sm"
          :class="codec.id === activeId ? 'btn-primary' : ''"
          @click="() => activeId = codec.id"
      >{{ codec.name }}</button>
    </div>

    <Base64Codec v-if="activeId === 'base64'"/>
    <URLCodec v-if="activeId === 'url'"/>
  </div>
</template>

<script lang="ts" setup>
import Base64Codec from '@/components/Codecs/Base64Codec';
import URLCodec from '@/components/Codecs/URLCodec';
import { ref } from 'vue';

const codecs = ref([
  { id: 'base64', name: 'Base64' },
  { id: 'url', name: 'URL编解码' },
]);
const activeId = ref<string>('base64');
</script>
