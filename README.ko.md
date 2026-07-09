<p align="center">
  <img src="icons/icon-128.png" alt="Japanese Reading Assistant" width="128" height="128" />
</p>

# 일본어 읽기 도우미

> 읽기 이해력을 강화하세요 — 웹 페이지에서 일본어를 선택하기만 하면 즉시 후리가나와 함께, 요청 시 제공되는 JLPT 수준 맞춤 AI 분석(번역, 문법, 어휘)을 받아보고, 학습한 내용을 복습 카드로 전환할 수 있습니다.

[Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · **한국어** · [Português](README.pt.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

웹에서 일본어를 읽기 위한 Chrome(Manifest V3) 확장 프로그램입니다. 후리가나는 로컬에서 즉시 생성되며, AI 설명은 요청할 때만 실행되고 사용자의 JLPT 수준에 맞춰 상세도가 조정됩니다.

## 기능

- **선택하여 학습** — 일본어 텍스트를 강조 표시하고 **あ** 버튼을 클릭하면 페이지 내 팝업이 열립니다.
- **즉시 후리가나** — 가나 읽기가 한자 위에 즉시 표시되며, 오프라인이고 무료입니다.
- **즉시 번역** — 무료 온디바이스 대략 번역(Chrome 내장 번역기)이 즉시 표시되며, 요청하면 AI의 번역으로 대체됩니다.
- **요청 시 AI 설명** — 번역, 문법, 어휘를 요청할 때만 생성합니다.
- **소리 내어 듣기** — 선택한 문장을 내장 음성으로 읽어줍니다.
- **JLPT 수준 맞춤** — 설명이 초급부터 N1까지 사용자의 일본어 수준에 맞춰 조정됩니다.
- **정확한 읽기** — AI가 애매한 한자의 후리가나를 교정합니다.
- **재사용 가능한 결과** — 분석된 문장이 캐시되며, 재분석 옵션을 제공합니다.
- **복습 카드** — 저장된 설명을 JLPT 수준별로 그룹화하고 수준 및 언어로 필터링할 수 있습니다.
- **9개 모국어** — 인터페이스와 설명이 선택한 언어를 따릅니다.
- **자신의 모델 사용** — 클라우드든 로컬이든 모든 OpenAI 호환 엔드포인트를 사용할 수 있습니다.

## 설치

아직 스토어에 등록되지 않았습니다 — 빌드된 확장 프로그램을 압축 해제된 상태로 로드하세요:

```bash
pnpm install
pnpm build        # outputs to dist/
```

1. `chrome://extensions`를 엽니다
2. **개발자 모드**를 활성화합니다
3. **압축 해제된 확장 프로그램을 로드**를 클릭하고 `dist/` 폴더를 선택합니다

> 확장 프로그램을 다시 로드한 후에는 이미 열려 있는 페이지를 새로 고쳐 새 content script가 삽입되도록 하세요.

## 사용법

1. 툴바 아이콘을 클릭하여 **설정**을 엽니다. **Learner**에서 모국어와 JLPT 수준을 선택하고, **Model**에서 OpenAI 호환 엔드포인트를 입력한 후 연결을 테스트합니다. 설정은 자동으로 저장됩니다.
2. 아무 페이지에서나 **일본어 텍스트를 선택**하고 나타나는 **あ** 버튼을 클릭합니다.
3. 팝업에 **후리가나**가 즉시 표시됩니다. **Explain with AI**를 클릭하면 분석을 볼 수 있습니다.
4. 설명은 복습 카드로 저장됩니다. 팝업에서 **Review**를 열어 탐색하고, 필터링(수준 / 언어)하고, 관리할 수 있습니다.

## 모델

이 확장 프로그램은 모든 **OpenAI 호환** `/chat/completions` 엔드포인트와 통신합니다 — 하나의 설정(`Base URL`, `Model`, `API Key`)으로 클라우드와 로컬을 모두 처리합니다.

| | Example Base URL | API Key |
|---|---|---|
| **클라우드** | `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, `https://dashscope.aliyuncs.com/compatible-mode/v1`, … | 필수 |
| **로컬** | `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio) | 대개 불필요 |

일반적인 제공자용 프리셋이 설정에 내장되어 있습니다. 두 필드 모두 편집 가능한 콤보박스이므로 어떤 값이든 입력할 수 있습니다.

> **로컬(Ollama) 참고:** 요청은 확장 프로그램의 origin에서 발생합니다. 연결 테스트가 403/CORS 오류를 반환하면 확장 프로그램 origin을 허용하세요 — 예: `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"`를 실행한 후 Ollama를 다시 시작합니다.

## 개발

**pnpm**이 필요합니다.

```bash
pnpm install
pnpm dev          # Vite dev server with HMR (load dist/ as unpacked)
pnpm build        # production build → dist/
pnpm type-check   # vue-tsc
```

- **후리가나 사전** — `scripts/copy-dict.mjs`가 dev/build 전에 kuromoji 사전을 `node_modules`에서 `public/assets/dict/`로 복사합니다(~19 MB, 커밋되지 않음).
- **아이콘** — `icons/icon.svg`를 편집한 다음 `node scripts/generate-icons.mjs`를 실행하여 PNG를 다시 생성하세요(Chrome 확장 프로그램 아이콘은 래스터여야 합니다).
- **패키징** — `pnpm zip`이 `dist/`를 빌드하고 압축하여 버전이 지정된 설치용 zip으로 만듭니다("압축 해제된 확장 프로그램을 로드"로 로드).
