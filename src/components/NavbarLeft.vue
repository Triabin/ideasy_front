<!-- 导航栏左侧 -->
<template>
  <!-- Logo -->
  <RouterLink to="/">
    <div class="rounded-xl size-9 bg-primary flex justify-center items-center font-bold text-primary-content round-font">灵</div>
  </RouterLink>
  <RouterLink to="/">
    <span class="text-xl ml-2 font-bold overflow-hidden whitespace-nowrap text-ellipsis">
      能网页&nbsp;&nbsp;不软件
    </span>
  </RouterLink>
</template>
<style lang="css" scoped>
/* 圆体字体 */
.round-font {
  font-family: 'Yuanti SC',
    'YouYuan',
    '汉仪润圆',
    '方正粗圆',
    ui-rounded,
    'PingFang SC',
    'Microsoft YaHei',
    'HarmonyOS Sans SC',
    'Noto Sans CJK SC',
    'WenQuanYi Micro Hei',
    system-ui,
    sans-serif;
}
</style>
