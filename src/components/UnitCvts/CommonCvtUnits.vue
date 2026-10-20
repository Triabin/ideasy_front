<!-- 常用换算关系组件 -->
<template>
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body gap-2">
      <h2 class="card-title text-base">常用换算关系</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        <div
            v-for="(pair, i) in props.commons"
            :key="i"
            class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center gap-2"
        >
          <span class="font-mono whitespace-nowrap">{{ pair[0] }}</span>
          <span class="opacity-40">→</span>
          <span class="font-mono break-all">{{ pair[1] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
const props = defineProps<{ commons: Array<[string, string]> }>();
</script>
