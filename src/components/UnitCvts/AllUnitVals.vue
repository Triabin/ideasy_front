<!-- 全部单位对照表组件 -->
<template>
  <div v-if="props.parsedValue !== null && props.allUnitVals.length" class="card bg-base-200 shadow-sm">
    <div class="card-body gap-2">
      <h2 class="card-title text-base">全部单位对照<span class="text-xs font-normal opacity-60">（点击任意条目复制数值）</span></h2>
      <div class="overflow-x-auto rounded-xl border border-base-300 bg-base-100">
        <table class="table table-sm md:table-compact">
          <thead>
          <tr class="bg-base-200/60">
            <th>单位</th>
            <th class="text-right">数值</th>
            <th class="text-right hidden md:table-cell">千分位</th>
            <th class="w-16"></th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="row in props.allUnitVals"
              :key="row.unit.id"
              class="cursor-pointer hover:bg-primary/10 transition-colors"
              :class="row.unit.id === dstUnit?.id ? 'bg-primary/5' : ''"
              title="点击复制"
              @click="copy(row.text)"
          >
            <td class="whitespace-nowrap">
              {{ row.unit.name }}
              <span class="opacity-50 font-mono text-xs ml-1">{{ row.unit.symbol }}</span>
              <span v-if="row.unit.id === srcUnit?.id" class="badge badge-primary badge-xs ml-1">源</span>
            </td>
            <td class="text-right font-mono break-all">{{ row.text }}</td>
            <td class="text-right font-mono opacity-70 hidden md:table-cell">{{ row.grouped }}</td>
            <td class="text-right opacity-50">
              <Copied v-if="copiedText === row.text" :size="14" :twClasses="['fill-success']"/>
              <Copy v-else :size="14"/>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { ref } from 'vue';
import { type UnitDef } from './units.ts';
import { copyText, popupTip } from '@/common/utils.ts';

const props = defineProps<{
  parsedValue: number | null;
  allUnitVals: { unit: UnitDef; text: string; grouped: string; }[];
  srcUnit: UnitDef | undefined;
  dstUnit: UnitDef | undefined;
}>();
const copiedText = ref<string>('');
const truncate = (s: string) => (s.length > 20 ? s.slice(0, 8) + '…' + s.slice(-6) : s);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text || text === '—') return;
  await copyText(text);
  copiedText.value = text;
  popupTip(`已复制 ${truncate(text)}`, 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
};
</script>
