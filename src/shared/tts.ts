// 用浏览器内置 Web Speech API 朗读日语。优先本地语音（localService=true）：
// 离线、免费、不经任何服务器，与"不依赖云 AI"的取向一致。macOS 自带高质量日语音（Kyoko/Otoya）。
let cachedVoice: SpeechSynthesisVoice | null = null;

export function ttsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

function pickJaVoice(): SpeechSynthesisVoice | null {
  const ja = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ja'));
  // 本地语音优先，避免走网络的云端语音
  return ja.find((v) => v.localService) ?? ja[0] ?? null;
}

// 语音列表异步加载：提前预热，就绪后缓存
if (ttsSupported()) {
  const warm = (): void => {
    cachedVoice = pickJaVoice();
  };
  warm();
  speechSynthesis.addEventListener?.('voiceschanged', warm);
}

export function speakJa(text: string, rate = 1): void {
  if (!ttsSupported() || !text.trim()) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP';
  const voice = cachedVoice ?? pickJaVoice();
  if (voice) utter.voice = voice;
  utter.rate = rate;
  speechSynthesis.cancel(); // 打断上一段
  speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (ttsSupported()) speechSynthesis.cancel();
}
