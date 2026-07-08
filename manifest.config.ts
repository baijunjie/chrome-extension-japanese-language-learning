import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: '日语阅读助手',
  description: pkg.description,
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
    default_title: '日语阅读助手',
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
  // storage: 设置/卡片持久化；host_permissions: SW 跨域调用用户配置的 AI 端点(含 localhost)
  permissions: ['storage'],
  host_permissions: ['<all_urls>'],
  // content script 需从扩展内加载 kuromoji 词典
  web_accessible_resources: [
    {
      resources: ['assets/dict/*'],
      matches: ['<all_urls>'],
    },
  ],
});
