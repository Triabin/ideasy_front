<!-- 转换结果展示组件 -->
<template>
  <div
      v-if="props.parsed !== null && props.dstValue !== null"
      class="rounded-xl border border-base-300 bg-base-100 p-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 select-all"
  >
    <span class="text-3xl font-bold font-mono break-all">{{ formatNumber(props.dstValue) }}</span>
    <span class="text-lg opacity-70">{{ props.dstUnit?.symbol ?? '' }}</span>
    <span class="ml-auto text-sm opacity-60 font-mono break-all">
      = {{ withThousands(props.parsed) }} {{ props.srcUnit?.symbol ?? '' }}
    </span>
    <CopyBtn :value="formatNumber(props.dstValue)" popup-tip="on"/>
  </div>
  <div v-else-if="props.parseError" class="text-error text-sm font-mono">{{ props.parseError }}</div>
  <div v-else class="opacity-40 font-mono text-sm rounded-xl border border-dashed border-base-300 p-4 text-center">
    输入数值后自动换算
  </div>
</template>

<script setup lang="ts">
import { formatNumber, withThousands, type UnitDef } from './units.ts';
import CopyBtn from '@/components/CopyBtn';

const props = defineProps<{
  /** 解析后的数值（null 表示无效或空输入） */
  parsed: number | null;
  /** 目标单位换算结果 */
  dstValue: number | null;
  /** 解析报错信息 */
  parseError: string;
  /** 待转换单位 */
  srcUnit: UnitDef | undefined;
  /** 目标单位 */
  dstUnit: UnitDef | undefined;
}>();
</script>
