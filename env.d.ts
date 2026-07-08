/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

// CSS 以字符串形式引入（content script 注入 Shadow DOM 用）
declare module '*.css?inline' {
  const css: string;
  export default css;
}
