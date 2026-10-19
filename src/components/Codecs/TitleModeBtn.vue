<!-- 编解码器标题模式切换按钮通用组件 -->
<template>
  <div class="flex items-center justify-between flex-wrap gap-2">
    <!-- 左边标题 -->
    <h2 class="card-title text-base normal-case">{{ props.title }}</h2>
    <!-- 右边编解码按钮 -->
    <div class="join">
      <button
          class="btn btn-outline btn-primary btn-sm join-item"
          :class="{ 'btn-active': props.mode === 'encode' }"
          @click="() => emit('switchMode', 'encode')"
      >编码</button>
      <button
          class="btn btn-outline btn-primary btn-sm join-item"
          :class="{ 'btn-active': props.mode === 'decode' }"
          @click="() => emit('switchMode', 'decode')"
      >解码</button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { type CodecMode } from './codec.ts';

const props = defineProps<{
  title: string;
  mode: CodecMode;
}>();
const emit = defineEmits<{ (e: 'switchMode', newMode: CodecMode): void }>();
</script>
