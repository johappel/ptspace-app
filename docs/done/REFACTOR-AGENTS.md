# REFACTOR-AGENTS.md

Du arbeitest an zwei zusammengehörenden Repositories:

```text
https://github.com/johappel/pedagogical-thinking-space
https://github.com/johappel/ptspace-app
```

Ihre Beziehung ist:

```text
pedagogical-thinking-space
= pädagogischer Kernel

ptspace-app
= optionale lehrkräftefreundliche GUI
```

## Deine Aufgabe

Führe das Refactoring und die noch fehlende Implementierung vollständig durch.

Nutze als verbindliche Arbeitsgrundlage:

- `REFACTOR-GOAL.md`
- `REFACTOR-TASKS.md`

Der Kernel ist die fachliche Quelle.

Die App darf keine eigene pädagogische Semantik erfinden oder unabhängig speichern.

---

## Verbindliche Arbeitsweise

1. Lies zuerst `REFACTOR-GOAL.md` vollständig.
2. Lies danach `REFACTOR-TASKS.md` vollständig.
3. Bearbeite die Tasks streng in der vorgegebenen Reihenfolge.
4. Beginne keine spätere Phase, solange notwendige frühere Kernel-Verträge fehlen.
5. Ändere Kernel und App gemeinsam, wenn ein Vertrag beide betrifft.
6. Führe nach jedem kleinen Arbeitsschritt passende Tests aus.
7. Erhalte bestehende Daten.
8. Implementiere Migrationen, bevor alte Felder entfernt werden.
9. Erzeuge kleine, nachvollziehbare Commits.
10. Dokumentiere nach jeder Phase:
    - geänderte Dateien,
    - ausgeführte Tests,
    - offene Probleme,
    - nächste Aufgabe.

---

## Entscheidungsregeln

Bei einem Konflikt gilt diese Reihenfolge:

```text
1. Schutz pädagogischer Verantwortung
2. Kernel-Vertrag
3. Datenverlust vermeiden
4. Rückwärtskompatibilität
5. einfache lehrkräftefreundliche Bedienung
6. technische Bequemlichkeit
```

Wenn App-Code und Kernel-Dokumentation widersprechen:

```text
Kernel prüfen
→ Kernel gegebenenfalls präzisieren
→ App daraus ableiten
```

Ändere niemals nur die App, um einen ungelösten fachlichen Widerspruch zu verdecken.

---

## Zentrale fachliche Regeln

### Regel 1

Das Learning Design ist das übergeordnete pädagogische Verständnis.

### Regel 2

Lernmomente und Übergänge liegen in `learning-landscape.md`.

### Regel 3

Eine Lernaktivität beschreibt, was Lernende innerhalb eines Lernmoments tun.

Für die erste Version ist sie Bestandteil des Lernmoments.

### Regel 4

Eine Connection ist nur ein Übergang.

Sie ist kein eigenständiger Lernmoment und kein Materialcontainer.

### Regel 5

Unterrichtsfenster und Platzierungen liegen in `temporal-plan.yml`.

### Regel 6

Drag-and-drop eines Lernmoments in ein Unterrichtsfenster erzeugt nur eine zeitliche Platzierung.

Es verändert nicht die Lernlandschaft.

### Regel 7

Ein Materialbedarf ist noch kein Material.

### Regel 8

Ein Materialbedarf kann zu einer Planungsboard-Karte führen.

### Regel 9

Eine Board-Karte startet keinen Worker durch Verschieben.

Nur eine ausdrückliche Lehrkraft-Aktion erzeugt einen Service Request.

### Regel 10

KI-Änderungen sind Vorschläge.

Ohne sichtbare Zustimmung dürfen sie keine kanonischen Dateien verändern.

---

## Verbotene Abkürzungen

Du darfst nicht:

- Zeitdaten nur im Frontend speichern,
- `temporal-plan.yml` auslassen,
- ein zweites unabhängiges Aktivitätenmodell einführen,
- `nextSteps` parallel zum Planungsboard weiterführen,
- Material und Board-Karte gleichsetzen,
- einen Worker automatisch beim Drop auf „Vorbereiten“ starten,
- eine Node automatisch aus einer Chatantwort speichern,
- alte Daten ohne Migration löschen,
- Tests nur deshalb entfernen, weil sie nach dem Umbau fehlschlagen,
- Kernel-Schemas in der App frei nachbauen, ohne sie mit dem Kernel abzugleichen.

---

## Erwartete Implementierungsreihenfolge

Arbeite mindestens in dieser Reihenfolge:

```text
1. Kernel-Begriffe und Quellen der Wahrheit
2. Learning-Landscape-Schema
3. Temporal-Plan-Schema
4. Planning-Board- und Materialbezüge
5. Beispielworkspace und Migration
6. App-Domain-Typen
7. Codecs
8. Persistenz und API
9. Lernmoment- und Übergangsdetails
10. Materialbedarf und Board
11. Zeit & Dramaturgie
12. Critical-Friend-Vorschläge
13. Worker-Rückführung
14. Migration bestehender Daten
15. Unit-, Integrations- und E2E-Tests
16. Dokumentation und Abschlussbericht
```

---

## Verhalten bei Unsicherheit

Wenn eine kleine technische Entscheidung offen ist:

- wähle die einfachste Lösung,
- die den Kernel-Vertrag vollständig erfüllt,
- Datenverlust verhindert,
- gut testbar ist,
- keine zusätzliche Fachsemantik einführt.

Wenn eine fachliche Entscheidung offen ist:

- erfinde keine neue Semantik,
- markiere die Stelle,
- leite eine konservative Lösung aus `REFACTOR-GOAL.md` ab,
- dokumentiere die Annahme.

Stoppe nicht wegen kleiner Unklarheiten.

Liefere eine sichere, konsistente Best-Effort-Implementierung.

---

## Pflichtprüfungen vor Abschluss

Vor Abschluss müssen mindestens erfolgreich sein:

```text
Kernel-Dokumentationsprüfung
Schema- und Beispielvalidierung
Typecheck
Lint
Unit-Tests
API-Integrationstests
E2E-Tests
Produktions-Build
Migrationstest
Read-Write-Read-Roundtrip für Zeitdaten
```

Besonders wichtig ist der Regressionstest:

```text
temporal-plan.yml laden
→ Platzierung ändern
→ speichern
→ neu laden
→ vollständige semantische Gleichheit
```

---

## Abschlussformat

Gib am Ende einen Bericht aus:

```markdown
# Refactoring abgeschlossen

## Umgesetzte Kernel-Änderungen

## Umgesetzte App-Änderungen

## Migrationen

## Tests

## Noch bekannte Einschränkungen

## Geänderte Dateien

## Commits
```

Melde eine Aufgabe nur als abgeschlossen, wenn Implementierung, Tests und Dokumentation zusammenpassen.
