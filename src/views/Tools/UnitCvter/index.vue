<!-- 单位换算页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">单位换算</h1>
    <p class="text-sm opacity-70 text-center">
      支持人民币、长度、时间、重量、能量、体积、面积、角度、温度、功率等常用单位的快速互转。
    </p>
    <!-- 类别选择 -->
    <div class="flex flex-wrap justify-center gap-2">
      <button
          v-for="c in categories"
          :key="c.id"
          class="btn btn-sm rounded-full gap-1.5"
          :class="activeId === c.id ? 'btn-primary' : ''"
          @click="() => activeId = c.id"
      >
        <span>{{ c.icon }}</span>
        <span>{{ c.name }}</span>
      </button>
    </div>

    <RMB v-if="activeId === 'rmb'"/>
    <Length v-if="activeId === 'length'"/>
    <Time v-if="activeId === 'time'"/>
    <Mass v-if="activeId === 'mass'"/>
    <Energy v-if="activeId === 'energy'"/>
    <Volume v-if="activeId === 'volume'"/>
    <Area v-if="activeId === 'area'"/>
    <Angle v-if="activeId === 'angle'"/>
    <Temperature v-if="activeId === 'temperature'"/>
    <Power v-if="activeId === 'power'"/>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import RMB from '@/components/UnitCvts/RMB';
import Length from '@/components/UnitCvts/Length';
import Time from '@/components/UnitCvts/Time';
import Mass from '@/components/UnitCvts/Mass';
import Energy from '@/components/UnitCvts/Energy';
import Volume from '@/components/UnitCvts/Volume';
import Area from '@/components/UnitCvts/Area';
import Angle from '@/components/UnitCvts/Angle';
import Temperature from '@/components/UnitCvts/Temperature';
import Power from '@/components/UnitCvts/Power';

// 当前选中的单位换算项ID
const activeId = ref<string>('rmb');
// 可选单位换算选项
const categories = ref<{
  /** 唯一标识 */
  id: string;
  /** 图标 */
  icon: string;
  /** 单位名称 */
  name: string;
}[]>([
  { id: 'rmb', icon: '💰', name: '人民币' },
  { id: 'length', icon: '📏', name: '长度' },
  { id: 'time', name: '时间', icon: '⏱️' },
  { id: 'mass', name: '重量', icon: '⚖️' },
  { id: 'energy', name: '能量', icon: '⚡' },
  { id: 'volume', name: '体积', icon: '🧊' },
  { id: 'area', name: '面积', icon: '🗺️' },
  { id: 'angle', name: '角度', icon: '📐' },
  { id: 'temperature', name: '温度', icon: '🌡️' },
  { id: 'power', name: '功率', icon: '🔋' },
]);
</script>
