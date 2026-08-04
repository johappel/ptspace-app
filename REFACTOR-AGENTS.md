# Aktueller Agentenauftrag

Stand: 2026-08-04

Diese Datei ist der verbindliche Einstieg für Coding-Agenten im Repository `ptspace-app`.
Sie konkretisiert `AGENTS.md` für den aktuellen Produktmeilenstein.

## Vor jeder Arbeit lesen

1. `AGENTS.md`
2. `ROADMAP.md`
3. `docs/milestones/REAL-RUNTIME-MVP.md`
4. das GitHub-Issue, das den aktuellen Auftrag beschreibt
5. die dort ausdrücklich genannten Quell- und Vertragsdateien

Ältere Refactor-Dokumente bleiben als Entstehungsgeschichte und fachliche Referenz erhalten. Bei Widersprüchen gilt für den aktuellen Meilenstein diese Reihenfolge:

1. aktueller Kernel `pedagogical-thinking-space`
2. `docs/milestones/REAL-RUNTIME-MVP.md`
3. aktuelles GitHub-Issue
4. `ROADMAP.md`
5. ältere App-Dokumente

## Aktueller Produktfokus

Die App wird vom Mock-/Hybridprototyp zu einem reproduzierbaren, harness-basierten MVP weiterentwickelt.

Die Reihenfolge ist verbindlich:

1. Kernel und App synchronisieren
2. persistente Runtime-Sessions einführen
3. Kontextbudget und kontrollierte Gesprächsverdichtung implementieren
4. realen Harness- und Sitzungsbetrieb verifizieren
5. Browser-E2E und CI-Gates ergänzen
6. Tastatur-, Screenreader- und Responsive-Abnahme durchführen

Bis zur Abnahme werden keine neuen Worker-Arten, Exportformate, Räume, Dashboard-Bereiche oder sonstigen Produktfunktionen begonnen, sofern sie nicht für den Referenzablauf zwingend erforderlich sind.

## Verbindliche Regeln

- Der sichtbare Gesprächspartner heißt **Pedagogical Companion**. `Critical Friend` bezeichnet nur eine mögliche reflexive Fähigkeit, nicht mehr die öffentliche Rolle.
- Die App verwendet die aktuelle systemisch-reflexive Haltung des Kernels; eine reine Umbenennung genügt nicht.
- Jeder Planungsraum besitzt eine persistente, wiederaufnehmbare Runtime-Session.
- Mock- und Real-Harness implementieren denselben Adaptervertrag und dieselben API-Routen.
- Runtime-Zusammenfassungen sind nicht-kanonische Read-Models. Sie ersetzen niemals `learning-design`, `decisions`, Lernlandschaft, Zeitplanung oder andere kanonische Artefakte.
- Der Browser spricht niemals direkt mit dem Harness.
- Technische Permission-Anfragen werden durch Backend-Policies behandelt und nicht an Lehrkräfte durchgereicht.
- Kanonische Dateien werden nur validiert, atomar und nachvollziehbar geändert.
- Ein Arbeitspaket ist erst abgeschlossen, wenn die im Meilenstein definierten Tests und Abnahmekriterien erfüllt sind.

## Arbeitsweise pro Issue

1. Auftrag und Abgrenzung lesen.
2. Betroffene Verträge, Dateien und Tests ermitteln.
3. Bestehenden Stand prüfen; Checkboxen und Behauptungen nicht ungeprüft übernehmen.
4. Kleinste zusammenhängende Änderung umsetzen.
5. Unit-, Integrations- und erforderliche E2E-Tests ergänzen.
6. Relevante Checks ausführen.
7. Dokumentation und `ROADMAP.md` nur aktualisieren, wenn sich der nachweisbare Status geändert hat.
8. In der PR genau dokumentieren:
   - geänderte Dateien,
   - Architekturentscheidungen,
   - ausgeführte Tests und Ergebnisse,
   - bekannte Einschränkungen,
   - Risiken und Folgearbeit.

## Statuspflege

- `ROADMAP.md` zeigt den knappen Gesamtstand.
- `docs/milestones/REAL-RUNTIME-MVP.md` enthält Umfang, Reihenfolge und Definition of Done.
- GitHub-Issues enthalten die konkret ausführbaren Arbeitspakete.
- `TASKS.md` bleibt die detaillierte Komponenten- und Implementierungshistorie.
- Nur belegte, getestete Ergebnisse werden als abgeschlossen markiert.

## Nächster Einstieg

Der nächste Agent beginnt mit dem ersten noch offenen Issue des Meilensteins. Er startet keine spätere Phase, solange Abhängigkeiten aus einer früheren Phase ungeklärt sind, dokumentiert Blocker aber ausdrücklich statt sie still zu umgehen.
