# Qualitative Abnahmevorlage: Denkraum-Fokusmodi

Stand: 2026-08-07  
Verwendung: Issue #17 / Draft-PR #18  
Status dieser Vorlage: auszufüllen, keine automatische Abnahme

Diese Vorlage trennt die qualitative Browserprüfung von Typechecks, automatischen Tests und Screenshot-Erzeugung. Eine erfolgreiche technische Prüfung darf Issue #17 oder Draft-PR #18 nicht allein schließen.

## Prüfkontext

- Browser / Gerät:
- Viewport Desktop:
- Viewport schmal:
- Zoom:
- Reduced Motion:
- Ohne Illustration / ohne Ton:
- Datum und prüfende Person:
- getesteter Planungsraum:

## Gemeinsame Prüffragen

- [ ] Der aktive Hauptgegenstand ist ohne Suche erkennbar.
- [ ] Das Gespräch bleibt erhalten, konkurriert aber nicht in jedem Modus gleich stark.
- [ ] Es gibt keine dauerhaft gleichrangige Sidebar mit Zusatzinhalten.
- [ ] Herkunft aus dem Gespräch und Rückkehrpunkt sind sichtbar und verständlich.
- [ ] Der Moduswechsel verändert weder Bedeutung noch Datenmodell des Gegenstands.
- [ ] Tastaturfokus wird sinnvoll an den Hauptbereich übergeben.
- [ ] Screenreader erhalten eine sprechende Überschrift und den aktiven Kontext.
- [ ] Reduced Motion und schmale Darstellung sind funktionsgleich.
- [ ] Worker-, Queue-, Harness-, Runtime- und Service-Request-Sprache bleibt aus der normalen Lehrkräfteoberfläche heraus.

## Prüfung je Fokusmodus

### Gespräch

- [ ] Gesprächsverlauf, Eingabe und aktueller Fokus sind dominant und direkt erreichbar.
- [ ] Nur der kompakte Zugang zum Denkstand bleibt sichtbar.
- [ ] Kein Zusatzbereich wirkt wie ein zweiter Hauptworkflow.

### Pinnwand

- [ ] Die Pinnwand übernimmt den Hauptarbeitsraum und zeigt wenige kuratierte Spuren.
- [ ] Spurtypen, Herkunft und die Aktionen „Im Gespräch aufgreifen“ / „Zur Herkunft“ sind verständlich.
- [ ] Eine ausgewählte Spur aktualisiert die sichtbare Gesprächsbegleitung.
- [ ] Der vollständige Gesprächsfaden ist nur bei Bedarf geöffnet.

### Lernlandschaft

- [ ] Lernlandschaft und Planungsraumkontext sind klar benannt.
- [ ] Canvas und lineare Darstellung sind gleichwertig erreichbar.
- [ ] Ein ausgewählter Lernmoment oder Übergang verändert den Gesprächskontext nachvollziehbar.

### Zeit & Dramaturgie

- [ ] Unterrichtsfenster und Übergänge bilden den Hauptgegenstand.
- [ ] Die Gesprächsbegleitung bezieht sich auf das ausgewählte Zeitfenster.
- [ ] Gewichtung, Realismus und offene Zeitfragen sind ohne technische Begriffe verständlich.

### Vorbereitungen

- [ ] Im Gesprächsmodus bleibt nur eine flache Statuszeile.
- [ ] Die bewusst geöffnete Vorbereitung übernimmt den Hauptbereich.
- [ ] Derselbe Arbeitszustand wird nicht doppelt oder dreifach projiziert.

### Materialien

- [ ] Material oder Ergebnis liegt als prüfbarer Hauptgegenstand auf dem Tisch.
- [ ] Prüfen, kommentieren, freigeben und Weiterreden sind klar unterscheidbar.
- [ ] Die Gesprächsbegleitung ist materialbezogen und nicht wieder ein vollständiger konkurrierender Faden.

## Ergebnis

- Festgestellte qualitative Stärken:
- Festgestellte qualitative Schwächen:
- Blockierende Abweichungen:
- Folge-Issue / nächste freigegebene Arbeit:
- Entscheidung: [ ] qualitativ abnahmebereit  [ ] offen  [ ] blockiert

Bei fehlender verlässlicher Browser-Sichtprüfung bleibt die Entscheidung „offen“, auch wenn `pnpm visual:design`, Checks und Tests erfolgreich sind.
