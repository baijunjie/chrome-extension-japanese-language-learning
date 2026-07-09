<p align="center">
  <img src="icons/icon-128.png" alt="Japanese Reading Assistant" width="128" height="128" />
</p>

# Assistente de leitura de japonês

> Reforce sua compreensão de leitura — selecione qualquer texto em japonês numa página web para obter furigana instantâneo e uma análise por IA sob demanda e adaptada ao JLPT (tradução, gramática, vocabulário), e transforme o que você estuda em cartões revisáveis.

[Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md) · **Português** · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Uma extensão para Chrome (Manifest V3) para ler japonês na web. O furigana é gerado localmente e de forma instantânea; a explicação por IA é executada somente quando você a solicita e adapta sua profundidade ao seu nível JLPT.

## Recursos

- **Selecione para aprender** — destaque um texto em japonês e clique no botão **あ** para abrir um popup na página.
- **Furigana instantâneo** — as leituras em kana aparecem sobre os kanji imediatamente, offline e gratuitamente.
- **Tradução instantânea** — uma tradução aproximada e gratuita no dispositivo (o tradutor integrado do Chrome) aparece imediatamente, substituída pela da IA quando você solicita.
- **Explicação por IA sob demanda** — tradução, gramática e vocabulário, gerados somente quando você solicita.
- **Ouvir em voz alta** — ouça a frase selecionada lida por uma voz integrada.
- **Ciente do JLPT** — as explicações se adaptam ao seu nível de japonês, do iniciante ao N1.
- **Leituras precisas** — a IA corrige o furigana para kanji ambíguos.
- **Resultados reutilizáveis** — as frases analisadas são armazenadas em cache, com uma opção de reanálise.
- **Cartões de revisão** — explicações salvas, agrupadas por nível JLPT e filtráveis por nível e idioma.
- **9 idiomas nativos** — a interface e as explicações seguem o idioma que você escolher.
- **Traga seu próprio modelo** — qualquer endpoint compatível com OpenAI, na nuvem ou local.

## Instalação

Ainda não há listagem na loja — carregue a extensão compilada de forma descompactada:

```bash
pnpm install
pnpm build        # outputs to dist/
```

1. Abra `chrome://extensions`
2. Ative o **Modo de desenvolvedor**
3. **Carregar sem compactação** → selecione a pasta `dist/`

> Após recarregar a extensão, atualize quaisquer páginas já abertas para que o novo content script seja injetado.

## Uso

1. Clique no ícone da barra de ferramentas para abrir as **Configurações**. Em **Aprendiz**, escolha seu idioma nativo e nível JLPT; em **Model**, insira um endpoint compatível com OpenAI e teste a conexão. As configurações são salvas automaticamente.
2. Em qualquer página, **selecione um texto em japonês** e clique no botão **あ** que aparece.
3. O popup mostra o **furigana** imediatamente; clique em **Explicar com IA** para obter a análise.
4. As explicações são salvas como cartões de revisão — abra **Revisão** a partir do popup para navegar, filtrar (nível / idioma) e gerenciá-los.

## Modelos

A extensão se comunica com qualquer endpoint `/chat/completions` **compatível com OpenAI** — uma única configuração (`Base URL`, `Model`, `API Key`) cobre tanto a nuvem quanto o local.

| | Exemplo de Base URL | API Key |
|---|---|---|
| **Nuvem** | `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, `https://dashscope.aliyuncs.com/compatible-mode/v1`, … | obrigatória |
| **Local** | `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio) | geralmente nenhuma |

Predefinições para provedores comuns estão integradas nas Configurações; ambos os campos são comboboxes editáveis, então você pode digitar qualquer valor.

> **Nota sobre local (Ollama):** a requisição se origina da origem da extensão. Se o teste de conectividade retornar um erro 403/CORS, permita a origem da extensão — por exemplo, `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"` e depois reinicie o Ollama.

## Desenvolvimento

Requer **pnpm**.

```bash
pnpm install
pnpm dev          # Vite dev server with HMR (load dist/ as unpacked)
pnpm build        # production build → dist/
pnpm type-check   # vue-tsc
```

- **Dicionário do furigana** — `scripts/copy-dict.mjs` copia o dicionário do kuromoji de `node_modules` para `public/assets/dict/` antes do dev/build (~19 MB, não versionado).
- **Ícones** — edite `icons/icon.svg`, depois execute `node scripts/generate-icons.mjs` para regenerar os PNGs (os ícones de extensão do Chrome devem ser raster).
- **Empacotamento** — `pnpm zip` compila e compacta `dist/` num zip de instalação versionado (carregue-o via "Carregar sem compactação").
