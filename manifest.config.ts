import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  // 名称/描述走 Chrome i18n（_locales + __MSG__），随浏览器语言显示、保持一致
  default_locale: 'en',
  name: '__MSG_appName__',
  description: '__MSG_appDesc__',
  version: pkg.version,
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
    256: 'icons/icon-256.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: '__MSG_appName__',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  // storage: 设置/卡片持久化；contextMenus: 选区右键菜单入口；
  // host_permissions: SW 跨域调用用户配置的 AI 端点(含 localhost)
  permissions: ['storage', 'contextMenus'],
  host_permissions: ['<all_urls>'],
  // content script 需从扩展内加载 kuromoji 词典
  web_accessible_resources: [
    {
      resources: ['assets/dict/*'],
      matches: ['<all_urls>'],
    },
  ],
});
