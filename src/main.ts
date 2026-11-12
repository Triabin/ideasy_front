import { createApp } from 'vue';
import App from './App.vue';
import '@/styles';
import router from '@/router';
import store from '@/stores';
import autoGlobal from '@/plugins/autoGlobal';
import analytics from '@/plugins/analytics';

const app = createApp(App)
  .use(autoGlobal)
  .use(store)
  .use(analytics)
  .use(router);
app.mount('#app');
