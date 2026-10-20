<!-- 输入与单位切换组件 -->
<template>
  <div class="flex flex-wrap items-center gap-3">
    <label class="join grow min-w-64">
      <input
          type="text"
          inputmode="decimal"
          class="input input-lg join-item grow font-mono"
          :class="{ 'input-error': !!props.parseError }"
          v-model="inputText"
          placeholder="请输入数值，如：100 / 1,234.56"
          spellcheck="false"
      />
      <select v-model="srcId" class="select select-lg join-item w-48 shrink-0">
        <option v-for="u in props.units" :key="u.id" :value="u.id">
          {{ u.name }}（{{ u.symbol }}）
        </option>
      </select>
    </label>
    <button class="btn btn-circle btn-ghost" title="交换源/目标单位" @click="swapUnits">⇄</button>
    <label class="join shrink-0">
      <select v-model="dstId" class="select select-lg join-item w-48">
        <option v-for="u in props.units" :key="u.id" :value="u.id">
          {{ u.name }}（{{ u.symbol }}）
        </option>
      </select>
    </label>
  </div>
</template>
<script lang="ts" setup>
import { ref, watch } from 'vue';
import { type UnitDef } from './units.ts';

const props = defineProps<{
  /** 涉及到的所有单位 */
  units: UnitDef[];
  /** 解析错误信息 */
  parseError: string;
  /** 默认初始化值 */
  initData?: { inputText: string; srcId: string; dstId: string; }
}>();
const emits = defineEmits<{
  (e: 'inputComUpdateData', payload: {
    inputText: string;
    srcId: string;
    dstId: string;
  }): void;
}>();
const inputText = ref<string>(props.initData?.inputText ?? '');
const srcId = ref<string>(props.initData?.srcId ?? '');
const dstId = ref<string>(props.initData?.dstId ?? '');
const swapUnits = () => {
  const temp = srcId.value;
  srcId.value = dstId.value;
  dstId.value = temp;
}
watch([inputText, srcId, dstId], () => emits('inputComUpdateData', {
  inputText: inputText.value,
  srcId: srcId.value,
  dstId: dstId.value
}));
</script>
