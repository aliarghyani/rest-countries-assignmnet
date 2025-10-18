
// Performance monitoring (opt-in via VITE_ENABLE_PERF_METRICS)
import { initPerformanceMonitoring } from '@/perf/metrics';

if (import.meta.env.VITE_ENABLE_PERF_METRICS === 'true') {
  initPerformanceMonitoring();
}

// Load vue core
import store from '@/store';
import { createApp } from 'vue';

import App from '@/App.vue';
import vuetify from '@/plugins/vuetify';
import router from '@/router';

/** Register Vue */
const vue = createApp(App);
vue.use(router);
vue.use(store);
vue.use(vuetify);

// Run!
router
  .isReady()
  .then(() => vue.mount('#app'))
  .catch(e => console.error(e));
