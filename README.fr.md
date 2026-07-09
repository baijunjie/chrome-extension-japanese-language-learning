<p align="center">
  <img src="icons/icon-128.png" alt="Japanese Reading Assistant" width="128" height="128" />
</p>

# Assistant de lecture du japonais

> Renforcez votre compréhension écrite — sélectionnez n'importe quel texte japonais sur une page web pour obtenir instantanément les furigana ainsi qu'une analyse IA à la demande, adaptée au niveau JLPT (traduction, grammaire, vocabulaire), et transformez ce que vous étudiez en cartes à réviser.

[Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · **Français** · [한국어](README.ko.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Une extension Chrome (Manifest V3) pour lire le japonais sur le web. Les furigana sont générés localement et instantanément ; l'explication IA ne s'exécute que lorsque vous la demandez et adapte sa profondeur à votre niveau JLPT.

## Fonctionnalités

- **Sélectionner pour apprendre** — surlignez un texte japonais et cliquez sur le bouton **あ** pour ouvrir une fenêtre contextuelle dans la page.
- **Furigana instantanés** — les lectures en kana apparaissent aussitôt au-dessus des kanji, hors ligne et gratuitement.
- **Explication IA à la demande** — traduction, grammaire et vocabulaire, générées uniquement lorsque vous le demandez.
- **Adaptée au JLPT** — les explications s'adaptent à votre niveau de japonais, du débutant au N1.
- **Lectures exactes** — l'IA corrige les furigana pour les kanji ambigus.
- **Résultats réutilisables** — les phrases analysées sont mises en cache, avec une option de réanalyse.
- **Cartes de révision** — les explications enregistrées, regroupées par niveau JLPT et filtrables par niveau et par langue.
- **9 langues natives** — l'interface et les explications suivent la langue que vous choisissez.
- **Utilisez votre propre modèle** — n'importe quel point de terminaison compatible OpenAI, dans le cloud ou en local.

## Installation

Pas encore de fiche sur le store — chargez l'extension compilée en mode non empaqueté :

```bash
pnpm install
pnpm build        # outputs to dist/
```

1. Ouvrez `chrome://extensions`
2. Activez le **mode développeur**
3. **Charger l'extension non empaquetée** → sélectionnez le dossier `dist/`

> Après avoir rechargé l'extension, actualisez les pages déjà ouvertes afin que le nouveau content script soit injecté.

## Utilisation

1. Cliquez sur l'icône de la barre d'outils pour ouvrir les **Paramètres**. Sous **Apprenant**, choisissez votre langue native et votre niveau JLPT ; sous **Model**, saisissez un point de terminaison compatible OpenAI et testez la connexion. Les paramètres sont enregistrés automatiquement.
2. Sur n'importe quelle page, **sélectionnez du texte japonais** et cliquez sur le bouton **あ** qui apparaît.
3. La fenêtre contextuelle affiche immédiatement les **furigana** ; cliquez sur **Explain with AI** pour obtenir l'analyse.
4. Les explications sont enregistrées sous forme de cartes de révision — ouvrez **Review** depuis la fenêtre contextuelle pour les parcourir, les filtrer (niveau / langue) et les gérer.

## Modèles

L'extension communique avec n'importe quel point de terminaison `/chat/completions` **compatible OpenAI** — une seule configuration (`Base URL`, `Model`, `API Key`) couvre à la fois le cloud et le local.

| | Exemple de Base URL | API Key |
|---|---|---|
| **Cloud** | `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, `https://dashscope.aliyuncs.com/compatible-mode/v1`, … | requise |
| **Local** | `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio) | généralement aucune |

Des préréglages pour les fournisseurs courants sont intégrés aux paramètres ; les deux champs sont des zones de liste modifiables, vous pouvez donc saisir n'importe quelle valeur.

> **Note pour le local (Ollama) :** la requête provient de l'origine de l'extension. Si le test de connectivité renvoie une erreur 403/CORS, autorisez l'origine de l'extension — par ex. `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"` puis redémarrez Ollama.

## Développement

Nécessite **pnpm**.

```bash
pnpm install
pnpm dev          # Vite dev server with HMR (load dist/ as unpacked)
pnpm build        # production build → dist/
pnpm type-check   # vue-tsc
```

- **Dictionnaire de furigana** — `scripts/copy-dict.mjs` copie le dictionnaire kuromoji depuis `node_modules` vers `public/assets/dict/` avant le dev/build (~19 Mo, non commité).
- **Icônes** — modifiez `icons/icon.svg`, puis exécutez `node scripts/generate-icons.mjs` pour régénérer les PNG (les icônes d'extension Chrome doivent être matricielles).
