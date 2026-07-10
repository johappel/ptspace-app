# Lernlandschaft und Planungsboard in der App

> Diese Spezifikation übersetzt die Kernel-Verträge in eine lehrkräftefreundliche Arbeitsoberfläche.

## Produktentscheidung

Die App unterscheidet verbindlich drei Ebenen:

```text
Lernlandschaft
= didaktische Struktur aus Sicht der Lernenden

Zeit & Dramaturgie
= Unterrichtsfenster, zeitliche Platzierungen und gemeinsame Rhythmen

Planungsboard
= konkrete Arbeitsvorhaben der Lehrkraft und ihrer Dienste

Materialien
= Entwürfe, geprüfte Materialien und Unterrichtsfertiges
```

Eine Unterrichtsstunde ist kein „nächster Schritt“. Ein Lernmoment ist kein Planungsboard-Task. Ein Material ist das Ergebnis eines Arbeitsvorhabens, nicht dessen Synonym.

Der Kernel definiert die kanonischen Dateien:

- `specs/LEARNING_LANDSCAPE_SCHEMA.md`
- `specs/PLANNING_BOARD_SCHEMA.md`

## Teacher-facing UI

Die kompakte Seitenleiste zeigt nur Orientierung:

- Denkstand
- offene Entscheidungen
- „Nächste Schritte“: genau ein nächstes sinnvolles Arbeitsvorhaben aus dem Planungsboard
- Anzahl von Entwürfen und freigegebenen Materialien

Die ausführliche Arbeit findet in einem großen Modal statt:

```text
Unterrichtsplanung
  [ Lernlandschaft ] [ Zeit & Dramaturgie ] [ Planungsboard ] [ Materialien ]
```

Technische Begriffe wie Node, Edge, YAML, Service Request oder Workspace sind im Lehrkräfte-Modus nicht sichtbar.


## Kontextbezogenes Gespräch mit dem Critical Friend

Der Critical Friend bleibt derselbe Gesprächspartner des Planungsraums. Im Planungsmodal erscheint er jedoch als aufklappbarer, kontextbezogener Gesprächsbereich — kein zweiter, isolierter Chat.

Auslöser und Kontext:

| Auswahl | Gesprächskontext |
| --- | --- |
| Lernmoment | Funktion, Lernaktivität, erwartete Lernerfahrung, Übergänge, Zeitfenster, Materialien und offene Fragen |
| Übergang | Ausgangs-/Zielmoment und seine didaktische Bedeutung |
| Board-Karte | Arbeitsvorhaben, Beziehungen und bisheriger Status |
| Material | didaktischer Bezug, Entwurfs- und Prüfstatus |

Lehrkräfte sehen etwa „Zu diesem Lernmoment weiterdenken“ oder „Dieses Arbeitsvorhaben klären“, nicht technische Objektbezeichnungen.

Der Critical Friend kann im Kontext:

- nachfragen und Perspektiven anbieten,
- einen Vorschlag für die kanonische Lernlandschaft oder das Board erzeugen,
- eine neue Board-Karte vorschlagen,
- oder einen Worker-Auftrag **vorschlagen**.

Eine Unterhaltung, ein Vorschlag oder das Verschieben einer Karte startet keinen Worker. Erst eine sichtbare Freigabe erzeugt einen Service Request. „Zur Gesamtplanung“ löst den Fokus wieder und führt in das Gespräch des gesamten Planungsraums zurück.

## Lernlandschaft-Canvas

Der Canvas ist ein strukturierter didaktischer Planungstisch, kein freies Whiteboard.

Technologie: `@xyflow/svelte` (Svelte Flow).

### Karten

Karten repräsentieren Lernmomente, nicht automatisch Stunden:

- Impuls
- Lernort / Station
- Positionierung
- Erkundung
- Wahlphase
- Übung
- Projektphase
- Produkt
- Reflexion
- Leistungs- oder Rückmeldemoment

Jede Karte öffnet eine Detailansicht mit:

- didaktischer Funktion,
- Lernaktivität,
- erwarteter Lernerfahrung,
- Materialien,
- möglichen Übergängen,
- zeitlichen Platzierungen,
- Status und offenen Fragen.

### Verbindungen

Beim Anlegen einer Verbindung fragt die App nach ihrer didaktischen Bedeutung:

- gemeinsamer Weg,
- Wahl,
- parallel,
- Rückkehr,
- Treffpunkt,
- Voraussetzung.

Das reine Ziehen einer Karte verändert nur das Layout. Das Ändern einer Verbindung verändert die kanonische Lernlandschaft.

### Gruppen

Gruppenflächen können gemeinsame Einstiege, Stationenbereiche, Projektphasen, Räume oder Verdichtungen darstellen.

Sie haben keine automatische pädagogische Bedeutung; ihre Bedeutung wird explizit als Gruppe oder Übergang gespeichert.

## Zeit & Dramaturgie

Diese Ansicht ist ein Raster von Unterrichtsfenstern:

- Unterrichtsstunde,
- Doppelstunde,
- Projektblock,
- offene Lernzeit.

Lernmomente werden per Drag-and-drop zeitlich platziert. Eine Node darf mehrere Platzierungen haben. Wahl- und Stationsnodes dürfen innerhalb eines Fensters offen bleiben.

Die Ansicht beantwortet:

> Was geschieht realistisch wann mit dieser Lerngruppe?

Sie darf die Lernlandschaft nicht heimlich linear machen.

## Planungsboard

„Nächste Schritte“ ist der kompakte Einstieg in dieses Board, nicht ein eigenes Datenmodell. Die Seitenleiste zeigt eine priorisierte Karte und öffnet beim Anklicken genau diese Karte im Modal. Bestehende Service Requests werden bis zur Migration als Karten im Board dargestellt.

Das Board enthält Arbeitsvorhaben, keine Lernaktivitäten:

- Lernanliegen noch klären,
- Lehrplanbezug quellengeprüft recherchieren,
- didaktische Dramaturgie entwickeln,
- Medien auswählen,
- Arbeitsblatt als Entwurf vorbereiten,
- Quellen prüfen,
- Material freigeben.

Die Spalten sind lehrkräftefreundlich, intern stabil:

```text
Noch klären → Vorbereiten → Zur Prüfung → Bereit
```

Jede Karte kann auf Lernmomente, Unterrichtsfenster, Entscheidungen und Materialien verweisen. Nach Freigabe darf sie einen Service Request auslösen; dessen technische Details bleiben verborgen. Worker-Ergebnisse kehren auf der Karte als „Entwurf zur Prüfung“ zurück.

## AI-Proposals

Der Critical Friend und Dienste dürfen Änderungen nur als sichtbare Vorschläge einbringen.

### Landscape change proposal

Ein Vorschlag zeigt:

- betroffene Lernmomente und Übergänge,
- didaktische Begründung,
- erwartete Konsequenz,
- mögliche Änderung der zeitlichen Dramaturgie,
- Vorschau im Canvas.

Darstellung:

- neue Karte: hervorgehoben,
- geänderte Verbindung: markiert,
- vorgeschlagene Entfernung: ausgegraut, nicht gelöscht,
- zeitliche Verschiebung: Vergleich von bisher und Vorschlag.

Aktionen:

```text
Vorschau ansehen | Übernehmen | Im Gespräch verändern | Verwerfen
```

Ohne Zustimmung darf kein Vorschlag kanonische Dateien ändern.

### Board proposal

Der Critical Friend schlägt höchstens ein sinnvolles Arbeitsvorhaben auf einmal vor. Eine Freigabe erzeugt erst dann einen Service Request oder Worker-Auftrag.

## Materials

Materialien werden an Lernmomente und Planungsboard-Karten zugeordnet.

Ein Worker-Ergebnis erscheint als „Entwurf zur Prüfung“. Erst eine explizite fachliche Freigabe kann den Status „für den Unterricht bereit“ setzen.

## Required Tests

- Canvas-Daten können aus `learning-landscape.md` geladen werden.
- Layoutverschiebung ändert nur `learning-landscape.layout.json`.
- Kantenänderung aktualisiert die kanonische Landschaft und erstellt eine Git-Version.
- Ein Lernmoment kann mehreren Unterrichtsfenstern zugeordnet werden.
- Wahlphase bleibt bei zeitlicher Platzierung Wahlphase.
- KI-Vorschlag ändert vor Zustimmung keine kanonischen Dateien.
- Unbekannte Node- oder Übergangstypen werden abgelehnt.
- Worker-Material ist genau einem Lernmoment oder Board-Item zuordenbar.
