<p align="center">
  <img src="icons/icon-128.png" alt="Japanese Reading Assistant" width="128" height="128" />
</p>

# Japanese Reading Assistant

> Strengthen your reading comprehension — select any Japanese on a web page to get instant furigana plus an on-demand, JLPT-aware AI breakdown (translation, grammar, vocabulary), and turn what you study into reviewable cards.

[Deutsch](README.de.md) · **English** · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

A Chrome (Manifest V3) extension for reading Japanese on the web. Furigana is generated locally and instantly; the AI explanation runs only when you ask for it and adapts its depth to your JLPT level.

## Features

- **Select to learn** — highlight Japanese text and click the **あ** button to open an in-page popup.
- **Instant furigana** — kana readings appear over the kanji immediately, offline and free.
- **Instant translation** — a free on-device rough translation (Chrome's built-in translator) shows immediately, replaced by the AI's when you ask.
- **AI explanation on demand** — translation, grammar, and vocabulary, generated only when you ask.
- **Listen aloud** — hear the selected sentence read by a built-in voice.
- **JLPT-aware** — explanations adapt to your Japanese level, from beginner to N1.
- **Accurate readings** — the AI corrects furigana for ambiguous kanji.
- **Reusable results** — analyzed sentences are cached, with a re-analyze option.
- **Review cards** — saved explanations, grouped by JLPT level and filterable by level and language.
- **9 native languages** — the interface and explanations follow your chosen language.
- **Bring your own model** — any OpenAI-compatible endpoint, cloud or local.

## Install

No store listing yet — load the built extension unpacked:

```bash
pnpm install
pnpm build        # outputs to dist/
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder

> After reloading the extension, refresh any already-open pages so the new content script is injected.

## Usage

1. Click the toolbar icon to open **Settings**. Under **Learner**, choose your native language and JLPT level; under **Model**, enter an OpenAI-compatible endpoint and test the connection. Settings save automatically.
2. On any page, **select Japanese text** and click the **あ** button that appears.
3. The popup shows the **furigana** right away; click **Explain with AI** for the breakdown.
4. Explanations are saved as review cards — open **Review** from the popup to browse, filter (level / language), and manage them.

## Models

The extension talks to any **OpenAI-compatible** `/chat/completions` endpoint — one config (`Base URL`, `Model`, `API Key`) covers both cloud and local.

| | Example Base URL | API Key |
|---|---|---|
| **Cloud** | `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, `https://dashscope.aliyuncs.com/compatible-mode/v1`, … | required |
| **Local** | `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio) | usually none |

Presets for common providers are built into Settings; both fields are editable comboboxes, so you can type any value.

> **Local (Ollama) note:** the request originates from the extension's origin. If the connectivity test returns a 403/CORS error, allow the extension origin — e.g. `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"` then restart Ollama.

## Development

Requires **pnpm**.

```bash
pnpm install
pnpm dev          # Vite dev server with HMR (load dist/ as unpacked)
pnpm build        # production build → dist/
pnpm type-check   # vue-tsc
```

- **Furigana dictionary** — `scripts/copy-dict.mjs` copies the kuromoji dictionary from `node_modules` into `public/assets/dict/` before dev/build (~19 MB, not committed).
- **Icons** — edit `icons/icon.svg`, then run `node scripts/generate-icons.mjs` to regenerate the PNGs (Chrome extension icons must be raster).
- **Package** — `pnpm zip` builds and zips `dist/` into a versioned install zip (load it via "Load unpacked").
