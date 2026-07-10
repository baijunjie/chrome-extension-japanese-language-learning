// Content Script 入口：处理划词与右键菜单两种触发，保持零运行时依赖（每个页面都会注入）。
// 划词命中日语、或右键菜单点击时才动态加载弹层模块（Vue / i18n / 分词都在那个分包里）。
import type { ContextMenuTriggerMessage } from '@shared/messaging';
import type { SelectionInfo } from './store';

// 含日语（平假名/片假名/汉字/「々」）即视为可讲解
const JP_RE = /[぀-ゟ゠-ヿ々一-龯㐀-䶿]/;

type Overlay = typeof import('./overlay');

let overlay: Overlay | null = null;
let overlayPromise: Promise<Overlay> | null = null;

/** 懒加载弹层模块；加载失败不缓存，允许下次划词重试 */
function loadOverlay(): Promise<Overlay> {
  if (!overlayPromise) {
    overlayPromise = import('./overlay').then((m) => (overlay = m));
    overlayPromise.catch(() => {
      overlayPromise = null;
    });
  }
  return overlayPromise;
}

/** 读取当前选区的文本与矩形（文档坐标），无有效选区返回 null；不含语言过滤 */
function readSelection(): SelectionInfo | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().trim();
  if (!text) return null;
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

// 最近一次右键的文档坐标：选区丢失（如 input 内选区）时作为 popup 锚点兜底
let lastContextMenuPoint = { x: 0, y: 0 };

document.addEventListener('contextmenu', (e) => {
  lastContextMenuPoint = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
});

/** 菜单携带文本 + 右键坐标点矩形，作为实时选区取不到时的兜底 */
function selectionFromContextMenu(selectionText: string): SelectionInfo | null {
  // Chrome 会把 selectionText 中的换行压成空格，故仅作兜底
  const text = selectionText.trim();
  if (!text) return null;
  const { x, y } = lastContextMenuPoint;
  return { text, rect: { top: y, left: x, right: x, bottom: y } };
}

document.addEventListener('mouseup', (e) => {
  if (overlay?.isInsideHost(e)) return;
  // 延后到选区稳定后再读取
  setTimeout(() => {
    const info = readSelection();
    // 划词仅对日语选区弹图标
    if (!info || !JP_RE.test(info.text)) {
      overlay?.onSelectionCleared();
      return;
    }
    loadOverlay()
      .then((m) => m.showIcon(info))
      .catch(() => {});
  }, 0);
});

// 右键菜单触发：用户显式点击即响应，不做日语过滤
chrome.runtime.onMessage.addListener((msg: ContextMenuTriggerMessage) => {
  if (msg.type !== 'contextMenuTrigger') return;
  // 优先取实时选区；取不到（如 input 内选区）时退回菜单携带的文本
  const info = readSelection() ?? selectionFromContextMenu(msg.selectionText);
  if (!info) return;
  loadOverlay()
    .then((m) => m.showPopup(info))
    .catch(() => {});
});

// 点击 popup/图标之外关闭
document.addEventListener('mousedown', (e) => {
  if (!overlay || overlay.isInsideHost(e)) return;
  overlay.hideAll();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') overlay?.hideAll();
});
