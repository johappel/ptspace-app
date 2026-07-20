# Laufzeitregressionen – L5/L5a

Stand: 2026-07-20

## Behobene Transportpfade

- Chatbeiträge werden vor der Harness-Ausführung persistent gespeichert.
- SSE liefert die persistierte Lehrkraft-Nachrichten-ID und die Critical-Friend-Antwort; das Frontend lädt den Verlauf nach einem erfolgreichen Stream erneut.
- Der Frontend-Fallback nutzt `5174`. Die lokale, nicht versionierte `.env` darf weiterhin auf `3000` überschreiben.
- Material-GETs lösen `material-pb-<id>` auf `materials/pb-<id>.md` auf und berücksichtigen die vom Auftrag gesetzte Ausgabeposition.
- CORS ist für normale API-Antworten und den SSE-Stream gesetzt.

Die App verwendet für den Chat SSE. Ein WebSocket-Chat-Endpunkt mit `pong` gehört nicht zum aktuellen Vertrag.

## Nachweise

- `backend/test/TransportRegression.test.ts`: Verlauf nach Reload, KI-Antwort, CORS, SSE-`complete` und beide Materialpfade.
- Vollständig außerhalb der Sandbox: 29 Testdateien, 130 Tests.
- Typecheck und Produktions-Build erfolgreich; `git diff --check` sauber.
- Live-Mock-Runtime auf dem lokalen `.env`-Port `3000`: `/health`, `/api/planning-spaces` mit CORS und der Verlauf des betroffenen Raums antworten erfolgreich.
- Ein `404` auf `materials/student-instruction` ist für einen Raum ohne Arbeitsauftrag fachlich korrekt und wird verständlich gemeldet.

## Offen

- Browser-, Tastatur- und Screenreader-Abnahme.
- Die Diagnose hat außerhalb des Repos einen Raum `Live Route Check` und zwei gleichnamige Test-Turns im bestehenden Raum erzeugt. Diese Daten wurden nicht automatisch bereinigt, weil dafür eine ausdrückliche Freigabe für Änderungen am lokalen Runtime-Bestand erforderlich ist.
