<p align="center">
  <img src="icons/icon-128.png" alt="Japanese Reading Assistant" width="128" height="128" />
</p>

# Japanisch-Lesehilfe

> Stärke dein Leseverständnis — markiere beliebiges Japanisch auf einer Webseite, um sofort Furigana zu erhalten, dazu eine bei Bedarf abrufbare, JLPT-bewusste KI-Aufschlüsselung (Übersetzung, Grammatik, Wortschatz), und verwandle das Gelernte in wiederholbare Karten.

**Deutsch** · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Eine Chrome-Erweiterung (Manifest V3) zum Lesen von Japanisch im Web. Furigana wird lokal und sofort erzeugt; die KI-Erklärung läuft nur, wenn du sie anforderst, und passt ihre Tiefe an dein JLPT-Niveau an.

## Funktionen

- **Markieren zum Lernen** — hebe japanischen Text hervor und klicke auf die **あ**-Schaltfläche, um ein Popup direkt auf der Seite zu öffnen.
- **Sofortige Furigana** — Kana-Lesungen erscheinen umgehend über den Kanji, offline und kostenlos.
- **Sofortige Übersetzung** — eine kostenlose, grobe Übersetzung direkt auf dem Gerät (Chromes eingebauter Übersetzer) erscheint sofort und wird durch die der KI ersetzt, sobald du sie anforderst.
- **KI-Erklärung auf Abruf** — Übersetzung, Grammatik und Wortschatz, nur erzeugt, wenn du sie anforderst.
- **Vorlesen** — höre den markierten Satz, vorgelesen von einer eingebauten Stimme.
- **JLPT-bewusst** — Erklärungen passen sich deinem Japanisch-Niveau an, von Anfänger bis N1.
- **Genaue Lesungen** — die KI korrigiert Furigana bei mehrdeutigen Kanji.
- **Wiederverwendbare Ergebnisse** — analysierte Sätze werden zwischengespeichert, mit der Möglichkeit zur erneuten Analyse.
- **Wiederholungskarten** — gespeicherte Erklärungen, gruppiert nach JLPT-Niveau und filterbar nach Niveau und Sprache.
- **9 Muttersprachen** — die Oberfläche und die Erklärungen folgen deiner gewählten Sprache.
- **Eigenes Modell mitbringen** — jeder OpenAI-kompatible Endpunkt, ob Cloud oder lokal.

## Installation

Noch kein Store-Eintrag — lade die gebaute Erweiterung entpackt:

```bash
pnpm install
pnpm build        # outputs to dist/
```

1. Öffne `chrome://extensions`
2. Aktiviere den **Entwicklermodus**
3. **Entpackte Erweiterung laden** → wähle den Ordner `dist/`

> Nachdem du die Erweiterung neu geladen hast, aktualisiere alle bereits geöffneten Seiten, damit das neue Content-Skript eingespielt wird.

## Verwendung

1. Klicke auf das Symbol in der Symbolleiste, um die **Einstellungen** zu öffnen. Wähle unter **Lernende(r)** deine Muttersprache und dein JLPT-Niveau; gib unter **Modell** einen OpenAI-kompatiblen Endpunkt ein und teste die Verbindung. Die Einstellungen werden automatisch gespeichert.
2. **Markiere japanischen Text** auf einer beliebigen Seite und klicke auf die erscheinende **あ**-Schaltfläche.
3. Das Popup zeigt sofort die **Furigana**; klicke auf **Mit KI erklären** für die Aufschlüsselung.
4. Erklärungen werden als Wiederholungskarten gespeichert — öffne **Wiederholung** aus dem Popup, um sie zu durchsuchen, zu filtern (Niveau / Sprache) und zu verwalten.

## Modelle

Die Erweiterung kommuniziert mit jedem **OpenAI-kompatiblen** `/chat/completions`-Endpunkt — eine Konfiguration (`Base URL`, `Model`, `API Key`) deckt sowohl Cloud als auch lokal ab.

| | Beispiel-Base-URL | API Key |
|---|---|---|
| **Cloud** | `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, `https://dashscope.aliyuncs.com/compatible-mode/v1`, … | erforderlich |
| **Lokal** | `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio) | meist keiner |

Voreinstellungen für gängige Anbieter sind in die Einstellungen eingebaut; beide Felder sind editierbare Comboboxen, sodass du jeden beliebigen Wert eingeben kannst.

> **Hinweis für lokal (Ollama):** die Anfrage stammt vom Origin der Erweiterung. Falls der Verbindungstest einen 403-/CORS-Fehler zurückgibt, erlaube den Origin der Erweiterung — z. B. `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"` und starte Ollama danach neu.

## Entwicklung

Erfordert **pnpm**.

```bash
pnpm install
pnpm dev          # Vite dev server with HMR (load dist/ as unpacked)
pnpm build        # production build → dist/
pnpm type-check   # vue-tsc
```

- **Furigana-Wörterbuch** — `scripts/copy-dict.mjs` kopiert das kuromoji-Wörterbuch aus `node_modules` nach `public/assets/dict/` vor dev/build (~19 MB, nicht eingecheckt).
- **Symbole** — bearbeite `icons/icon.svg` und führe dann `node scripts/generate-icons.mjs` aus, um die PNGs neu zu erzeugen (Chrome-Erweiterungssymbole müssen Rastergrafiken sein).
- **Paket** — `pnpm zip` baut `dist/` und packt es in ein versioniertes Installations-Zip (lade es über „Entpackte Erweiterung laden“).
