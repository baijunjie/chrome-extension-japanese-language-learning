// Content Script 入口：划词检测 → 冒图标 → 点击后在 Shadow DOM 内挂载 Vue popup。
import { createApp, type App as VueApp } from 'vue';
import App from './App.vue';
import { ui, resetUi } from './store';
import { i18n } from '@shared/i18n';
import popupCss from './popup.css?inline';

// 含日语（平假名/片假名/汉字/「々」）即视为可讲解
const JP_RE = /[぀-ゟ゠-ヿ々一-龯㐀-䶿]/;

let host: HTMLElement | null = null;
let appInstance: VueApp | null = null;

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

  appInstance = createApp(App);
  appInstance.use(i18n);
  appInstance.mount(mountPoint);
}

/** 事件是否发生在扩展自身的 shadow 内（避免误关闭） */
function isInsideHost(e: Event): boolean {
  return !!host && e.composedPath().includes(host);
}

interface SelectionInfo {
  text: string;
  rect: { top: number; left: number; right: number; bottom: number };
}

function getSelectionInfo(): SelectionInfo | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().trim();
  if (!text || !JP_RE.test(text)) return null;
  const r = sel.getRangeAt(0).getBoundingClientRect();
  if (!r || (r.width === 0 && r.height === 0)) return null;
  // 转文档坐标，便于随滚动锚定
  const sx = window.scrollX;
  const sy = window.scrollY;
  return {
    text,
    rect: { top: r.top + sy, left: r.left + sx, right: r.right + sx, bottom: r.bottom + sy },
  };
}

document.addEventListener('mouseup', (e) => {
  if (isInsideHost(e)) return;
  // 延后到选区稳定后再读取
  setTimeout(() => {
    const info = getSelectionInfo();
    if (!info) {
      if (ui.mode === 'icon') resetUi();
      return;
    }
    ensureMounted();
    ui.text = info.text;
    ui.rect = info.rect;
    ui.analysis = { status: 'idle' };
    ui.mode = 'icon';
  }, 0);
});

// 点击 popup/图标之外关闭
document.addEventListener('mousedown', (e) => {
  if (isInsideHost(e)) return;
  if (ui.mode !== 'hidden') resetUi();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.mode !== 'hidden') resetUi();
});
