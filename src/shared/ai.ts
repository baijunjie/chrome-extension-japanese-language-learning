// OpenAI 兼容端点的 AI 客户端：调用 chat/completions，强制 JSON 输出，
// 解析失败最多重试 3 次（含纠正提示），仍失败则报错。
import type { AppSettings, Analysis } from './types';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { parseAnalysis } from './schema';

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 60_000;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function endpointUrl(baseURL: string): string {
  return baseURL.replace(/\/+$/, '') + '/chat/completions';
}

/** 单次请求，返回模型输出的文本内容 */
async function callChatOnce(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  jsonMode = true,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // 本地端点（Ollama/LM Studio）常无需 key，留空则不发 Authorization。
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  // OpenAI 要求 json_object 模式下消息中须含 "json" 字样，连通性测试等场景关闭该模式。
  const body: Record<string, unknown> = { model, temperature: 0.2, messages };
  if (jsonMode) body.response_format = { type: 'json_object' };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      signal:
        typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
          : undefined,
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw new Error('请求超时，请检查网络或端点是否可用');
    }
    throw new Error(`请求失败：${(e as Error).message}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`端点返回错误 ${res.status}：${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content.trim()) throw new Error('端点返回了空内容');
  return content;
}

/**
 * 分析一段日语，返回受 schema 约束的结构化结果。
 * 解析失败时携带纠正提示重试，累计 MAX_ATTEMPTS 次仍失败则抛错。
 */
export async function analyze(text: string, settings: AppSettings): Promise<Analysis> {
  const { baseURL, apiKey, model } = settings.model;
  if (!baseURL || !model) {
    throw new Error('尚未配置模型，请在设置中填写 baseURL 与 model');
  }
  const url = endpointUrl(baseURL);
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(settings) },
    { role: 'user', content: buildUserPrompt(text) },
  ];

  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const content = await callChatOnce(url, apiKey, model, messages);
    try {
      return parseAnalysis(content);
    } catch (e) {
      lastError = (e as Error).message;
      // 追加纠正提示后重试
      messages.push({ role: 'assistant', content });
      messages.push({
        role: 'user',
        content:
          `上次输出无法解析（原因：${lastError}）。` +
          '请重新输出，且只输出严格符合 JSON Schema 的合法 JSON，不要任何多余文字或 Markdown。',
      });
    }
  }
  throw new Error(`AI 输出解析失败，已重试 ${MAX_ATTEMPTS} 次。最后一次原因：${lastError}`);
}

/** 连通性测试：发一条最小请求，成功即返回 true，否则抛错 */
export async function testConnection(settings: AppSettings): Promise<void> {
  const { baseURL, apiKey, model } = settings.model;
  if (!baseURL || !model) throw new Error('请先填写 baseURL 与 model');
  const url = endpointUrl(baseURL);
  await callChatOnce(url, apiKey, model, [{ role: 'user', content: 'ping，请回复 ok' }], false);
}
