import { createApp } from 'vue';
import App from './App.vue';
import { loadSettings } from '@shared/settings';
import { i18n, setLocale } from '@shared/i18n';
import '../style.css';

// 挂载前按母语设好界面语言，避免首屏语言闪烁
void (async () => {
  const settings = await loadSettings();
  setLocale(settings.nativeLang);
  createApp(App).use(i18n).mount('#app');
})();
