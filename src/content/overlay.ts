// Shadow DOM 弹层模块：由入口在首次命中日语选区时动态加载，
// 承载 Vue 应用的挂载与 UI 状态操作（入口只透过本模块的导出函数交互）。
import { createApp } from 'vue';
import App from './App.vue';
import { ui, resetUi, type SelectionInfo } from './store';
import { i18n } from '@shared/i18n';
import popupCss from './popup.css?inline';

let host: HTMLElement | null = null;

/** 懒挂载：首次需要时创建 shadow host 并挂载 Vue */
function ensureMounted(): void {
  if (host) return;
  host = document.createElement('div');
  host.id = 'jpl-root';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = popupCss;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);
  document.body.appendChild(host);

  createApp(App).use(i18n).mount(mountPoint);
}

/** 事件是否发生在扩展自身的 shadow 内（避免误关闭） */
export function isInsideHost(e: Event): boolean {
  return !!host && e.composedPath().includes(host);
}

/** 在选区旁显示「あ」图标 */
export function showIcon(info: SelectionInfo): void {
  ensureMounted();
  ui.text = info.text;
  ui.rect = info.rect;
  ui.analysis = { status: 'idle' };
  ui.mode = 'icon';
}

/** 直接以 popup 态打开讲解（右键菜单触发，跳过图标态） */
export function showPopup(info: SelectionInfo): void {
  ensureMounted();
  ui.text = info.text;
  ui.rect = info.rect;
  ui.analysis = { status: 'idle' };
  ui.mode = 'popup';
}

/** 选区取消：仅图标态时收起（popup 由点击外部 / Esc 关闭） */
export function onSelectionCleared(): void {
  if (ui.mode === 'icon') resetUi();
}

/** 关闭图标与 popup */
export function hideAll(): void {
  if (ui.mode !== 'hidden') resetUi();
}
