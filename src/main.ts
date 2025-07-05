import { createApp } from 'vue';
import App from './App.vue';
import '@/styles';
import router from '@/router';
import store from '@/stores';
import autoGlobal from '@/plugins/autoGlobal';

const app = createApp(App)
  .use(autoGlobal)
  .use(store)
  .use(router);
app.mount('#app');
