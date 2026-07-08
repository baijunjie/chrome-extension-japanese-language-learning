<p align="center">
  <img src="icons/icon-128.png" alt="Japanese Reading Assistant" width="128" height="128" />
</p>

# 日语阅读助手

> 提升你的阅读理解能力——在网页上选中任意日语文本，即可即时获得振假名，以及按需生成、贴合 JLPT 等级的 AI 解析（翻译、语法、词汇），并把学到的内容转化为可复习的卡片。

[Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [Português](README.pt.md) · [Русский](README.ru.md) · **简体中文** · [繁體中文](README.zh-Hant.md)

一款用于在网页上阅读日语的 Chrome（Manifest V3）扩展。振假名在本地即时生成；AI 解析仅在你主动请求时才运行，并会根据你的 JLPT 等级调整讲解深度。

## 功能特性

- **选中即学**——高亮日语文本并点击 **あ** 按钮，即可打开页内弹窗。
- **即时振假名**——假名读音会立即显示在汉字上方，离线且免费。
- **按需 AI 解析**——翻译、语法与词汇，仅在你请求时才生成。
- **贴合 JLPT**——讲解会根据你的日语水平调整，从初学者到 N1。
- **准确的读音**——AI 会为有歧义的汉字修正振假名。
- **结果可复用**——已解析的句子会被缓存，并提供重新解析选项。
- **复习卡片**——保存的解析按 JLPT 等级分组，可按等级和语言筛选。
- **9 种母语**——界面与讲解会遵循你所选择的语言。
- **自带模型**——支持任意兼容 OpenAI 的接口，云端或本地皆可。

## 安装

尚未上架应用商店——请以未打包方式加载已构建的扩展：

```bash
pnpm install
pnpm build        # outputs to dist/
```

1. 打开 `chrome://extensions`
2. 启用 **开发者模式**
3. **加载已解压的扩展程序** → 选择 `dist/` 文件夹

> 重新加载扩展后，请刷新任何已打开的页面，以便注入新的内容脚本。

## 使用方法

1. 点击工具栏图标打开 **设置**。在 **学习者** 下选择你的母语和 JLPT 等级；在 **模型** 下填入兼容 OpenAI 的接口并测试连接。设置会自动保存。
2. 在任意页面上 **选中日语文本**，点击出现的 **あ** 按钮。
3. 弹窗会立即显示 **振假名**；点击 **Explain with AI** 获取详细解析。
4. 解析会保存为复习卡片——从弹窗中打开 **Review** 即可浏览、筛选（等级 / 语言）并管理它们。

## 模型

该扩展可与任何 **兼容 OpenAI** 的 `/chat/completions` 接口通信——一份配置（`Base URL`、`Model`、`API Key`）即可同时覆盖云端和本地。

| | Example Base URL | API Key |
|---|---|---|
| **云端** | `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, `https://dashscope.aliyuncs.com/compatible-mode/v1`, … | 必填 |
| **本地** | `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio) | 通常无需 |

Settings 内置了常见服务商的预设；两个字段都是可编辑的下拉组合框，你也可以输入任意值。

> **本地（Ollama）注意事项：** 请求来自扩展的 origin。如果连通性测试返回 403/CORS 错误，请允许该扩展的 origin——例如 `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"`，然后重启 Ollama。

## 开发

需要 **pnpm**。

```bash
pnpm install
pnpm dev          # Vite dev server with HMR (load dist/ as unpacked)
pnpm build        # production build → dist/
pnpm type-check   # vue-tsc
```

- **振假名词典**——`scripts/copy-dict.mjs` 会在 dev/build 之前将 kuromoji 词典从 `node_modules` 复制到 `public/assets/dict/`（约 19 MB，未提交到仓库）。
- **图标**——编辑 `icons/icon.svg`，然后运行 `node scripts/generate-icons.mjs` 重新生成 PNG（Chrome 扩展图标必须是位图）。
