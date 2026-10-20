<!-- 长度单位转换组件 -->
<template>
  <!-- 输入与换算区 -->
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body gap-3">
      <p class="text-sm opacity-60">从纳秒到年的常见时间单位互转。</p>

      <!-- 源数值 + 源单位 -->
      <InputUnits
          :units="UNITS"
          :parse-error="parseError"
          :init-data="{ inputText, srcId, dstId }"
          @input-com-update-data="inputComUpdateData"
      />

      <!-- 结果展示 -->
      <ShowRes
          :parsed="parsed"
          :dst-value="dstValue"
          :parse-error="parseError"
          :src-unit="srcUnit" :dst-unit="dstUnit"
      />
    </div>
  </div>

  <!-- 全部单位对照表（点击复制） -->
  <AllUnitVals
      :parsed-value="parsed"
      :src-unit="srcUnit"
      :dst-unit="dstUnit"
      :all-unit-vals="allUnitVals"
  />

  <!-- 常用换算关系 -->
  <CommonCvtUnits :commons="COMMONS"/>
</template>
<script lang="ts" setup>
import InputUnits from '../InputUnits.vue';
import ShowRes from '../ShowRes.vue';
import AllUnitVals from '../AllUnitVals.vue';
import CommonCvtUnits from '../CommonCvtUnits.vue';
import { computed, ref } from 'vue';
import { UNITS, COMMONS } from './time.ts';
import {
  parseNumber,
  convert,
  formatNumber,
  withThousands,
  type UnitDef,
} from '../units.ts';

/** 输入的内容 */
const inputText = ref<string>('1');
/** 待转单位ID */
const srcId = ref<string>('h');
/** 目标单位ID */
const dstId = ref<string>('ms');
/** 待转单位 */
const srcUnit = computed<UnitDef | undefined>(() => UNITS.find(u => u.id === srcId.value));
/** 目标单位 */
const dstUnit = computed<UnitDef | undefined>(() => UNITS.find(u => u.id === dstId.value));
/** 解析后的数值（null 表示无效或空输入） */
const parsed = computed<number | null>(() => {
  const raw = inputText.value.trim();
  if (!raw) return null;
  return parseNumber(raw);
});
/** 目标单位换算结果 */
const dstValue = computed<number | null>(() => {
  if (parsed.value === null) return null;
  try {
    return convert(UNITS, parsed.value, srcId.value, dstId.value);
  } catch {
    return null;
  }
});
/** 解析报错信息 */
const parseError = computed(() => {
  const raw = inputText.value.trim();
  if (!raw) return '';
  return parseNumber(raw) === null ? `无法解析为数值：${raw}` : '';
});
/** 全部单位对照表 */
const allUnitVals = computed(() => {
  const pv = parsed.value;
  if (pv === null) return [];
  return UNITS.map((u) => {
    let v: number | null = null;
    try {
      v = convert(UNITS, pv, srcId.value, u.id);
    } catch { /* ignore */ }
    const text = v === null ? '—' : formatNumber(v);
    return { unit: u, text, grouped: v === null ? '—' : withThousands(v) };
  });
});

const inputComUpdateData = (payload: {
  inputText: string;
  srcId: string;
  dstId: string;
}) => {
  inputText.value = payload.inputText;
  srcId.value = payload.srcId;
  dstId.value = payload.dstId;
}
</script>
