<!-- 顶部导航栏选项 -->
<template>
  <ul class="menu menu-horizontal rounded-box">
    <li v-for="route in metaRoutes">
      <details v-if="route.children && route.children.length > 0">
        <summary>{{ route.meta?.title }}</summary>
        <index :routes="route.children"/>
      </details>
      <RouterLink v-else :to="{ path: route.path }" :class="router.currentRoute.value.path === route.path ? 'menu-active' : ''">
        {{ route.meta?.title }}
      </RouterLink>
    </li>
  </ul>
</template>
<script lang="ts" setup>
import { type RouteRecordRaw, useRouter } from "vue-router";

const router = useRouter();
const props = defineProps<{
  routes: RouteRecordRaw[]
}>();
const metaRoutes = props.routes.filter((route) => route.meta && route.meta.title);
</script>
