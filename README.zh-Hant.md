<p align="center">
  <img src="icons/icon-128.png" alt="Japanese Reading Assistant" width="128" height="128" />
</p>

# 日語閱讀助手

> 提升你的閱讀理解能力——在網頁上選取任何日語，即可立即取得振假名，以及依需求觸發、因應 JLPT 等級的 AI 拆解（翻譯、文法、詞彙），並把你所學的內容轉化為可複習的卡片。

[Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [简体中文](README.zh-Hans.md) · **繁體中文**

一款用於在網頁上閱讀日語的 Chrome（Manifest V3）擴充功能。振假名在本機即時產生；AI 說明只在你主動要求時才執行，並會依你的 JLPT 等級調整詳盡程度。

## 功能特色

- **選取即學** — 標示日語文字後，點擊 **あ** 按鈕即可開啟頁內彈出視窗。
- **即時振假名** — 假名讀音會立即標註在漢字之上，離線且免費。
- **依需求觸發的 AI 說明** — 翻譯、文法與詞彙，只在你要求時才產生。
- **因應 JLPT 等級** — 說明會依你的日語程度調整，從初學者到 N1。
- **精準讀音** — AI 會針對歧義漢字修正振假名。
- **可重用的結果** — 已分析的句子會被快取，並提供重新分析的選項。
- **複習卡片** — 已儲存的說明會依 JLPT 等級分組，並可依等級與語言篩選。
- **9 種母語** — 介面與說明都會跟隨你選擇的語言。
- **自備模型** — 任何相容 OpenAI 的端點，雲端或本機皆可。

## 安裝

尚未上架商店——請以未封裝的方式載入建置好的擴充功能：

```bash
pnpm install
pnpm build        # outputs to dist/
```

1. 開啟 `chrome://extensions`
2. 啟用 **開發人員模式**
3. **載入未封裝項目** → 選取 `dist/` 資料夾

> 重新載入擴充功能後，請重新整理任何已開啟的頁面，讓新的 content script 得以注入。

## 使用方式

1. 點擊工具列圖示以開啟 **Settings**。在 **Learner** 之下，選擇你的母語與 JLPT 等級；在 **Model** 之下，輸入一個相容 OpenAI 的端點並測試連線。設定會自動儲存。
2. 在任何頁面上**選取日語文字**，並點擊出現的 **あ** 按鈕。
3. 彈出視窗會立即顯示**振假名**；點擊 **Explain with AI** 取得拆解。
4. 說明會被儲存為複習卡片——從彈出視窗開啟 **Review** 即可瀏覽、篩選（等級／語言）並管理它們。

## 模型

此擴充功能可與任何**相容 OpenAI** 的 `/chat/completions` 端點溝通——一份設定（`Base URL`、`Model`、`API Key`）即同時涵蓋雲端與本機。

| | Example Base URL | API Key |
|---|---|---|
| **雲端** | `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, `https://dashscope.aliyuncs.com/compatible-mode/v1`, … | 必填 |
| **本機** | `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio) | 通常不需要 |

設定中內建了常見服務供應商的預設值；兩個欄位都是可編輯的下拉組合框，因此你可以輸入任何值。

> **本機（Ollama）注意事項：** 請求源自擴充功能的來源（origin）。若連線測試回傳 403/CORS 錯誤，請允許該擴充功能的來源——例如 `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"`，然後重新啟動 Ollama。

## 開發

需要 **pnpm**。

```bash
pnpm install
pnpm dev          # Vite dev server with HMR (load dist/ as unpacked)
pnpm build        # production build → dist/
pnpm type-check   # vue-tsc
```

- **振假名字典** — `scripts/copy-dict.mjs` 會在 dev/build 之前，將 kuromoji 字典從 `node_modules` 複製到 `public/assets/dict/`（約 19 MB，未納入版本控制）。
- **圖示** — 編輯 `icons/icon.svg`，然後執行 `node scripts/generate-icons.mjs` 重新產生 PNG（Chrome 擴充功能圖示必須是點陣圖）。
