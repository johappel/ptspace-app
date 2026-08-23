# dsh-openai-adapter

Ein **OpenAI-kompatibler HTTP-Adapter** für den DeepSeek Harness (`@deepseek-ai/dsh`).
Er macht das Headless-Profil (`dsh --profile headless "<prompt>"`) als REST-API nutzbar –
so lässt sich DSH als „Custom/OpenAI-Provider“ in Open WebUI, LibreChat & Co. eintragen.

**Zero Dependencies** – nur Node.js ≥ 18 (nutzt `node:http`, `fetch` etc.). Kein `npm install`.

```
Client (Open WebUI / curl / …)
        │  OpenAI-Protokoll (HTTP + optional SSE)
        ▼
adapter.mjs   ── pro Request: spawn ──►  node lib/bin.js --profile headless "<prompt>"
                                              (frische, persistierte Session, stdout = Antwort)
```

## Quickstart

```powershell
cd F:\code\deepseek-harness\headless\dsh-openai-adapter
node adapter.mjs            # oder: npm start
# → listening on http://127.0.0.1:3110/v1
```

Der Adapter findet das installierte `@deepseek-ai/dsh` automatisch (er führt immer
`node …\lib\bin.js` aus – nie die `.ps1`/`.cmd`-Shims, damit Prompts ohne Shell-Quoting
sicher als Argument übergeben werden). Bei Bedarf explizit setzen:

```powershell
$env:DSH_BIN = "C:\nvm4w\nodejs\node_modules\@deepseek-ai\dsh\lib\bin.js"
node adapter.mjs
```

### Ausprobieren

```powershell
curl.exe http://127.0.0.1:3110/v1/models

curl.exe http://127.0.0.1:3110/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{\"model\":\"dsh-headless\",\"messages\":[{\"role\":\"user\",\"content\":\"Nenne drei Primzahlen.\"}]}'
```

Streaming (SSE, `data:`-Zeilen, Ende `data: [DONE]`):

```powershell
curl.exe -N http://127.0.0.1:3110/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{\"model\":\"dsh\",\"stream\":true,\"messages\":[{\"role\":\"user\",\"content\":\"Zaehle bis fuenf.\"}]}'
```

### In Open WebUI einbinden

1. *Einstellungen → Verbindungen → OpenAI-API → Verbindung hinzufügen*
2. URL: `http://127.0.0.1:3110/v1`
3. API-Key: beliebig – oder vorher `ADAPTER_API_KEY` setzen und denselben Key eintragen.
4. Modell: `dsh-headless` (oder `dsh`) auswählen.

LibreChat analog als `custom`-Endpoint mit `baseURL: http://127.0.0.1:3110/v1`.

## Endpoints

| Methode | Pfad                   | Verhalten                                              |
| ------- | ---------------------- | ------------------------------------------------------ |
| POST    | `/v1/chat/completions` | Chat-Completion; `stream: true` → SSE-Pseudo-Streaming |
| GET     | `/v1/models`           | Modellliste (`dsh-headless`, `dsh`)                    |
| GET     | `/v1/models/{id}`      | Einzelnes Modell                                       |
| GET     | `/healthz`             | Status (auch ohne API-Key erreichbar)                  |

Unterstützte Request-Felder: `model`, `messages` (`role`/`content`, Content auch als
Parts-Array), `stream`, `stream_options.include_usage`. Alles andere (`temperature`, …)
wird akzeptiert, aber ignoriert – das Headless-Profil hat keine solchen Regler.
Antwort enthält zusätzlich `dsh_meta` (Profil, Dauer).

## Konfiguration (Umgebungsvariablen)

| Variable             | Default     | Bedeutung                                                           |
| -------------------- | ----------- | ------------------------------------------------------------------- |
| `PORT`               | `3110`      | HTTP-Port                                                           |
| `ADAPTER_HOST`       | `127.0.0.1` | Bind-Adresse; Nicht-Loopback nur mit gesetztem `ADAPTER_API_KEY`    |
| `ADAPTER_API_KEY`    | *(leer)*    | Wenn gesetzt: `Authorization: Bearer <key>` wird erzwungen          |
| `DSH_BIN`            | auto        | Pfad zur JS-Einstiegsdatei von dsh (`lib/bin.js`) oder zu einer Exe |
| `DSH_PROFILE`        | `headless`  | An dsh übergebenes Profil                                           |
| `REQUEST_TIMEOUT_MS` | `600000`    | Kill nach so vielen ms → HTTP 504                                   |
| `MAX_CONCURRENT`     | `4`         | Gleichzeitig laufende Headless-Turns; darüber → HTTP 429            |
| `MAX_PROMPT_CHARS`   | `24000`     | Kürzung des zusammengesetzten Prompts (Windows-cmdline-Limit ≈ 32k) |

## Verhalten & Grenzen (bewusst ehrlich)

- **Zustandslos pro Request:** Jeder Aufruf ist ein frischer Headless-Turn. Multi-Turn
  funktioniert, weil OpenAI-Clients den kompletten Verlauf mitschicken – der Adapter
  baut daraus einen einzigen Prompt (Systemblock + `<user>/<assistant>`-Transkript,
  letzter User-Beitrag = Aufgabe). Das Harness-Gedächtnis *innerhalb* eines Turns
  (Tools, Sandbox, Skills, Workspace) bleibt voll erhalten; Sessions werden von dsh
  persistiert und können später inspiziert werden.
- **Pseudo-Streaming:** `headless` schreibt erst am Turn-Ende auf stdout. Der Adapter
  portioniert die fertige Antwort zügig als SSE-Deltas (~≤ 1,2 s Gesamtzusatz), damit
  UIs nicht hängen. Es ist also kein echtes Token-Streaming vom Modell.
- **Kein `--resume`:** Das headless-Profil dokumentiert kein Wiederaufnehmen einer
  Session – deshalb auch serverseitig kein Sitzungs-Mapping. Ein Follow-up muss den
  Kontext in den Messages enthalten (machen Chat-UIs standardmäßig).
- **Kein Auth-Layer by design:** Wie die DSH-Web-GUI lauscht der Adapter default auf
  Loopback. Für Fremdzugriff: `ADAPTER_API_KEY` setzen; der Start auf Nicht-Loopback
  wird ohne Key aktiv verweigert.
- **Fehlerabbildung:** Exitcode ≠ 0 → HTTP 502 (+ stderr-Auszug), Timeout → 504,
  Überlastung → 429, Bad Request → 400 – jeweils im OpenAI-`error`-Format.

## Tests

Mock-basierter Smoke-Test (keine echten Agent-Turns, kein Tokenverbrauch):

```powershell
npm test          # bzw.: node test/smoke.mjs
```

Deckt ab: `/models`, Chat nicht-streamend (inkl. `"`, `&`, `<`, `%`, `^`, `|`,
Zeilenumbrüche im Prompt → beweist shell-freie Argumentübergabe), SSE-Stream inkl.
`[DONE]` und Usage, 401/200 mit API-Key, 502 bei Crash des Subprozesses.

Echter End-to-End-Check gegen das installierte dsh:

```powershell
node adapter.mjs                       # Terminal 1
curl.exe -s http://127.0.0.1:3110/v1/chat/completions -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Beantworte mit genau einem Wort: Ping\"}]}"
```

## Troubleshooting

- **„Konnte @deepseek-ai/dsh nicht finden“** → `DSH_BIN` wie oben setzen
  (Pfad prüfen: `Test-Path "$((npm prefix -g))\node_modules\@deepseek-ai\dsh\lib\bin.js"`).
- **Port belegt** → `$env:PORT = 3120`.
- **Antwort dauert lange** → normal; ein Headless-Turn bootet den ganzen Harness
  (Tools, Sandbox). `GET /healthz` zeigt `active_turns`.
