<!-- 词级Diff高亮token渲染子组件（用VNode渲染，避免v-html注入风险） -->
<template>
  <template v-for="(token, i) in tokens" :key="i">
    <mark v-if="token.kind === 'changed'" :class="markClass">{{ token.text }}</mark>
    <span v-else>{{ token.text }}</span>
  </template>
</template>

<script lang="ts" setup>
import type { InlineToken } from './diffUtils';

defineProps<{
  /** 词级token列表 */
  tokens: InlineToken[];
  /** 变更片段的样式类名 */
  markClass: string;
}>();
</script>

<style scoped>
mark {
  border-radius: 0.15rem;
  padding-inline: 0.1rem;
  color: inherit;
}
</style>
