import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [vue(), tailwindcss(), crx({ manifest })],
  // vue-i18n(esm-bundler) 特性标志：仅用 Composition API，关闭 legacy 以消除告警并瘦身
  define: {
    __VUE_I18N_FULL_INSTALL__: 'false',
    __VUE_I18N_LEGACY_API__: 'false',
    __INTLIFY_PROD_DEVTOOLS__: 'false',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  server: {
    // CRXJS HMR：允许扩展页面(chrome-extension://)访问 dev server
    cors: { origin: [/chrome-extension:\/\//] },
    strictPort: true,
    port: 5173,
  },
});
