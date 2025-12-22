<!-- 微信应用模拟器组件 -->
<template>
  <div class="">
    <!-- 手机端 -->
    <div v-if="props.platform === 'phone'">
    </div>
    <!-- 平板端 -->
    <div v-if="props.platform === 'tablet'"></div>
    <!-- 桌面端 -->
    <div v-if="props.platform === 'desktop'"></div>
  </div>
</template>
<script lang="ts" setup>
const props = withDefaults(defineProps<{
  platform: 'phone' | 'tablet' | 'desktop';
  systemType: 'Android' | 'iOS' | 'Windows' | 'MacOS' | 'HarmonyOS';
}>(), {
  platform: 'phone',
  systemType: 'Android'
});
</script>
<style lang="css" scoped>

</style>
