<p align="center">
  <img src="icons/icon-128.png" alt="Japanese Reading Assistant" width="128" height="128" />
</p>

# Asistente de lectura de japonés

> Refuerza tu comprensión lectora: selecciona cualquier texto en japonés de una página web para obtener furigana al instante, además de un análisis con IA bajo demanda y adaptado al nivel JLPT (traducción, gramática, vocabulario), y convierte lo que estudias en tarjetas repasables.

[Deutsch](README.de.md) · [English](README.md) · **Español** · [Français](README.fr.md) · [한국어](README.ko.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Una extensión de Chrome (Manifest V3) para leer japonés en la web. El furigana se genera localmente y al instante; la explicación con IA solo se ejecuta cuando la pides y adapta su profundidad a tu nivel JLPT.

## Características

- **Selecciona para aprender** — resalta texto en japonés y haz clic en el botón **あ** para abrir un popup dentro de la página.
- **Furigana instantáneo** — las lecturas en kana aparecen sobre los kanji de inmediato, sin conexión y gratis.
- **Traducción instantánea** — una traducción aproximada gratuita en el dispositivo (el traductor integrado de Chrome) aparece de inmediato, reemplazada por la de la IA cuando la pides.
- **Explicación con IA bajo demanda** — traducción, gramática y vocabulario, generados solo cuando lo pides.
- **Escuchar en voz alta** — escucha la frase seleccionada leída por una voz integrada.
- **Consciente del JLPT** — las explicaciones se adaptan a tu nivel de japonés, desde principiante hasta N1.
- **Lecturas precisas** — la IA corrige el furigana para los kanji ambiguos.
- **Resultados reutilizables** — las frases analizadas se almacenan en caché, con opción de volver a analizar.
- **Tarjetas de repaso** — explicaciones guardadas, agrupadas por nivel JLPT y filtrables por nivel e idioma.
- **9 idiomas nativos** — la interfaz y las explicaciones siguen el idioma que elijas.
- **Usa tu propio modelo** — cualquier endpoint compatible con OpenAI, en la nube o local.

## Instalación

Todavía no hay publicación en la tienda: carga la extensión compilada sin empaquetar:

```bash
pnpm install
pnpm build        # outputs to dist/
```

1. Abre `chrome://extensions`
2. Activa el **Modo de desarrollador**
3. **Cargar descomprimida** → selecciona la carpeta `dist/`

> Después de recargar la extensión, actualiza cualquier página ya abierta para que se inyecte el nuevo content script.

## Uso

1. Haz clic en el icono de la barra de herramientas para abrir **Ajustes**. En **Aprendiz**, elige tu idioma nativo y tu nivel JLPT; en **Model**, introduce un endpoint compatible con OpenAI y prueba la conexión. Los ajustes se guardan automáticamente.
2. En cualquier página, **selecciona texto en japonés** y haz clic en el botón **あ** que aparece.
3. El popup muestra el **furigana** de inmediato; haz clic en **Explain with AI** para obtener el análisis.
4. Las explicaciones se guardan como tarjetas de repaso: abre **Review** desde el popup para explorarlas, filtrarlas (nivel / idioma) y gestionarlas.

## Modelos

La extensión se comunica con cualquier endpoint `/chat/completions` **compatible con OpenAI**: una sola configuración (`Base URL`, `Model`, `API Key`) cubre tanto la nube como lo local.

| | Base URL de ejemplo | API Key |
|---|---|---|
| **Nube** | `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, `https://dashscope.aliyuncs.com/compatible-mode/v1`, … | obligatoria |
| **Local** | `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio) | normalmente ninguna |

Los ajustes preestablecidos para proveedores comunes están integrados en Ajustes; ambos campos son comboboxes editables, así que puedes escribir cualquier valor.

> **Nota sobre lo local (Ollama):** la solicitud se origina en el origen de la extensión. Si la prueba de conectividad devuelve un error 403/CORS, permite el origen de la extensión, p. ej. `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"` y luego reinicia Ollama.

## Desarrollo

Requiere **pnpm**.

```bash
pnpm install
pnpm dev          # Vite dev server with HMR (load dist/ as unpacked)
pnpm build        # production build → dist/
pnpm type-check   # vue-tsc
```

- **Diccionario de furigana** — `scripts/copy-dict.mjs` copia el diccionario de kuromoji desde `node_modules` a `public/assets/dict/` antes de dev/build (~19 MB, no se incluye en el repositorio).
- **Iconos** — edita `icons/icon.svg`, luego ejecuta `node scripts/generate-icons.mjs` para regenerar los PNG (los iconos de las extensiones de Chrome deben ser rasterizados).
- **Empaquetado** — `pnpm zip` compila y comprime `dist/` en un zip de instalación versionado (cárgalo con **Cargar descomprimida**).
