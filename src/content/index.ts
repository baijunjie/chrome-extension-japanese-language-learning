// Content Script 入口：只做划词检测，保持零运行时依赖（每个页面都会注入）。
// 首次命中日语选区才动态加载弹层模块（Vue / i18n / 分词都在那个分包里）。
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
  if (overlay?.isInsideHost(e)) return;
  // 延后到选区稳定后再读取
  setTimeout(() => {
    const info = getSelectionInfo();
    if (!info) {
      overlay?.onSelectionCleared();
      return;
    }
    loadOverlay()
      .then((m) => m.showIcon(info))
      .catch(() => {});
  }, 0);
});

// 点击 popup/图标之外关闭
document.addEventListener('mousedown', (e) => {
  if (!overlay || overlay.isInsideHost(e)) return;
  overlay.hideAll();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') overlay?.hideAll();
});
