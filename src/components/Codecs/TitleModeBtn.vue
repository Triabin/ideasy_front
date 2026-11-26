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
      >{{ props.encodeLabel }}</button>
      <button
          class="btn btn-outline btn-primary btn-sm join-item"
          :class="{ 'btn-active': props.mode === 'decode' }"
          @click="() => emit('switchMode', 'decode')"
      >{{ props.decodeLabel }}</button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { type CodecMode } from './codec.ts';

const props = withDefaults(defineProps<{
  title: string;
  mode: CodecMode;
  /** encode 模式按钮文案（默认「编码」，可改为「转义」等） */
  encodeLabel?: string;
  /** decode 模式按钮文案（默认「解码」，可改为「反转义」等） */
  decodeLabel?: string;
}>(), {
  encodeLabel: '编码',
  decodeLabel: '解码',
});
const emit = defineEmits<{ (e: 'switchMode', newMode: CodecMode): void }>();
</script>
