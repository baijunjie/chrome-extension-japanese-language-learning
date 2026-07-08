// AI 分析结果的 JSON schema 定义、抽取与校验。
// schema 既作为契约嵌入系统提示词，也用于程序侧校验；校验失败由调用方触发重试。
import type { Analysis, FuriganaPart, GrammarPoint, VocabItem } from './types';

/** 传给模型与嵌入提示词的 JSON Schema（草案契约） */
export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['translation', 'grammar_points', 'vocabulary'],
  properties: {
    translation: { type: 'string', description: '整段日语翻译成用户母语' },
    grammar_points: {
      type: 'array',
      description: '语法点讲解，按用户 JLPT 等级选择深度',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['point', 'explanation', 'level'],
        properties: {
          point: { type: 'string', description: '语法形式，如「〜ている」' },
          explanation: { type: 'string', description: '用母语讲解该语法的含义与用法' },
          level: { type: 'string', description: 'JLPT 等级，如 N5' },
        },
      },
    },
    vocabulary: {
      type: 'array',
      description: '重点词汇',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['word', 'reading', 'meaning', 'pos'],
        properties: {
          word: { type: 'string', description: '词（原文写法）' },
          reading: { type: 'string', description: '假名读音（平假名）' },
          meaning: { type: 'string', description: '母语释义' },
          pos: { type: 'string', description: '词性（母语），如 名词/动词' },
        },
      },
    },
    furigana: {
      type: 'array',
      description: '假名切分：把原文按最小单位切分，逐项 {text, reading}，用于校正多音字读音',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'reading'],
        properties: {
          text: { type: 'string', description: '原文片段（按序拼接须与原文逐字相同）' },
          reading: {
            type: 'string',
            description: '该片段假名读音（平假名）；纯假名/标点/数字/空格为空串',
          },
        },
      },
    },
    notes: { type: 'string', description: '可选补充说明（母语）' },
  },
} as const;

export class AnalysisParseError extends Error {}

/** 从模型输出中抽取 JSON 文本：剥离 Markdown 代码围栏，截取首个 { 到末个 } */
function extractJsonText(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new AnalysisParseError('输出中未找到 JSON 对象');
  }
  return text.slice(start, end + 1);
}

function isStr(v: unknown): v is string {
  return typeof v === 'string';
}

function parseGrammarPoints(v: unknown): GrammarPoint[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new AnalysisParseError('grammar_points 不是数组');
  return v.map((item, i) => {
    const o = item as Record<string, unknown>;
    if (!o || !isStr(o.point) || !isStr(o.explanation)) {
      throw new AnalysisParseError(`grammar_points[${i}] 字段缺失或类型错误`);
    }
    return {
      point: o.point,
      explanation: o.explanation,
      level: isStr(o.level) ? o.level : '',
    };
  });
}

function parseVocabulary(v: unknown): VocabItem[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new AnalysisParseError('vocabulary 不是数组');
  return v.map((item, i) => {
    const o = item as Record<string, unknown>;
    if (!o || !isStr(o.word)) {
      throw new AnalysisParseError(`vocabulary[${i}] 字段缺失或类型错误`);
    }
    return {
      word: o.word,
      reading: isStr(o.reading) ? o.reading : '',
      meaning: isStr(o.meaning) ? o.meaning : '',
      pos: isStr(o.pos) ? o.pos : '',
    };
  });
}

function parseFurigana(v: unknown): FuriganaPart[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) throw new AnalysisParseError('furigana 不是数组');
  return v.map((item, i) => {
    const o = item as Record<string, unknown>;
    if (!o || !isStr(o.text)) throw new AnalysisParseError(`furigana[${i}] 缺少 text`);
    return { text: o.text, reading: isStr(o.reading) ? o.reading : '' };
  });
}

/**
 * 解析并校验模型输出为 Analysis；不合规则抛 AnalysisParseError（供调用方重试）。
 * 宽松处理：可选数组缺失时补空，但类型错误一律判为不合规。
 */
export function parseAnalysis(raw: string): Analysis {
  const jsonText = extractJsonText(raw);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(jsonText) as Record<string, unknown>;
  } catch (e) {
    throw new AnalysisParseError(`JSON 语法错误：${(e as Error).message}`);
  }
  if (!isStr(obj.translation) || !obj.translation.trim()) {
    throw new AnalysisParseError('缺少有效的 translation 字段');
  }
  const furigana = parseFurigana(obj.furigana);
  return {
    translation: obj.translation,
    grammar_points: parseGrammarPoints(obj.grammar_points),
    vocabulary: parseVocabulary(obj.vocabulary),
    ...(furigana && furigana.length ? { furigana } : {}),
    ...(isStr(obj.notes) && obj.notes.trim() ? { notes: obj.notes } : {}),
  };
}
