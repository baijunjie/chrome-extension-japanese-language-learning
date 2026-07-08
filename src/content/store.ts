// content script 与 Shadow DOM 内 Vue 应用之间共享的 UI 状态。
import { reactive } from 'vue';
import type { Analysis } from '@shared/types';

export type Mode = 'hidden' | 'icon' | 'popup';

/** 选区矩形（文档坐标，含滚动偏移，便于随页面滚动锚定） */
export interface AnchorRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; analysis: Analysis; saved: boolean }
  | { status: 'error'; message: string };

export const ui = reactive({
  mode: 'hidden' as Mode,
  text: '',
  rect: { top: 0, left: 0, right: 0, bottom: 0 } as AnchorRect,
  analysis: { status: 'idle' } as AnalysisState,
});

export function resetUi(): void {
  ui.mode = 'hidden';
  ui.text = '';
  ui.analysis = { status: 'idle' };
}
