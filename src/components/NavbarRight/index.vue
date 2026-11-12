<!-- 导航栏右侧 -->
<template>
  <div
      title="我的博客"
      class="cursor-pointer flex items-center"
      @click="openUrl('https://spirit.triabin.cn')">
    <img src="https://spirit.triabin.cn/icons/favicon.png" alt="spirit-favicon" class="size-6"/>
    <span class="text-sm">博客</span>
  </div>
  <ThemeController/>
  <span class="text-gray-500 cursor-default">||</span>
  <div
      title="访问GitHub仓库"
      class="cursor-pointer"
      @click="openUrl('https://github.com/Triabin/ideasy_front')">
    <GitHub :size="24"/>
  </div>
</template>

<script lang="ts" setup>
import ThemeController from '@/components/ThemeController';
import GitHub from '@/components/icons/GitHub.vue';
import { openUrl } from '@/common/utils.ts';
</script>
