import { createRouter, createWebHashHistory } from 'vue-router';

export const routes = [
  {
    path: '/home',
    component: () => import('@/views/Home'),
    meta: {
      title: '主页'
    }
  },
  {
    path: '/',
    redirect: '/home'
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});
