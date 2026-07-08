import { createApp } from 'vue';
import App from './App.vue';
import { loadSettings } from '@shared/settings';
import { i18n, setLocale } from '@shared/i18n';
import '../options/style.css';

void (async () => {
  const settings = await loadSettings();
  setLocale(settings.nativeLang);
  createApp(App).use(i18n).mount('#app');
})();
