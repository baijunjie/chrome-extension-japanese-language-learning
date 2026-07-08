// vue-i18n 实例（Composition 模式）。三个扩展面 import 后 app.use(i18n)，
// 组件内用 vue-i18n 的 useI18n({ useScope: 'global' }) 取 t；locale 由母语驱动。
import { createI18n } from 'vue-i18n';
import type { NativeLang } from './types';
import { messages } from './locales';

export const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages,
});

export function setLocale(l: NativeLang): void {
  i18n.global.locale.value = l;
}
