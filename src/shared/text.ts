// 选中文本的内容归一化：用于缓存键与卡片内容匹配。
// 目的：仅相差首尾标点或空白的选区视为同一内容，命中同一缓存/卡片。
// 做法：去掉所有空白（日语正文无空格），再剥离首尾标点。注意保留长音符「ー」（属词的一部分）。
import type { JlptLevel, NativeLang } from './types';

const EDGE_PUNCT = `。、，,．.！!？?；;：:「」『』（）()［］\\[\\]【】〔〕《》〈〉…‥・〜~"'“”‘’—–-`;
const LEAD_RE = new RegExp(`^[\\s${EDGE_PUNCT}]+`);
const TRAIL_RE = new RegExp(`[\\s${EDGE_PUNCT}]+$`);

export function normalizeContent(text: string): string {
  return text.replace(/\s+/g, '').replace(LEAD_RE, '').replace(TRAIL_RE, '');
}

/**
 * 内容键：归一化内容 + 等级 + 母语（分析结果随这三者变化）。
 * 既是分析缓存的主键，也冗余存在卡片上（建索引）用于"该内容是否已记录"查询。
 */
export function contentKey(text: string, level: JlptLevel, lang: NativeLang): string {
  return `${normalizeContent(text)}␟${level}␟${lang}`;
}
