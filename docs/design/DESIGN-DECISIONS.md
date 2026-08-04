# Design Decisions

Diese Datei dokumentiert gestalterische Entscheidungen, die über einzelne Komponenten hinausgehen. Sie ersetzt keine Komponenten-Dokumentation und keine Git-Historie.

## Format

```markdown
## DD-YYYY-NNN – Titel

Status: proposed | accepted | superseded
Datum:
Betroffene Referenzzustände:

### Kontext

### Entscheidung

### Begründung

### Auswirkungen

### Verworfen
```

## DD-2026-001 – Denkraumqualität ist ein durchgehendes Produkt-Gate

Status: accepted  
Datum: 2026-08-04  
Betroffene Referenzzustände: DR-01 bis DR-09

### Kontext

Die technische Real-Runtime-Roadmap behandelte Frontendqualität hauptsächlich im Rahmen der abschließenden Zugänglichkeitsabnahme. Dadurch bestand das Risiko, dass ein technisch funktionierender, zugänglicher, aber dashboardartiger Planungsraum den Meilenstein erfüllt.

### Entscheidung

Die atmosphärische und visuelle Qualität des Denkraums wird als M0 vor die Runtime-Phasen gesetzt und bleibt als Design-Gate für alle folgenden Frontend-PRs verbindlich.

### Begründung

Der Denkraum ist keine dekorative Hülle. Seine Hierarchie, Ruhe, Materialität und Gesprächszentrierung übersetzen das pädagogische Produktmodell in ein Nutzungserlebnis.

### Auswirkungen

- eigener `DENKRAUM-DESIGN-CONTRACT`;
- Referenzzustände und visuelle Nachweise;
- Denkraum-Abschnitt im PR-Template;
- qualitative Designabnahme zusätzlich zu E2E und Accessibility;
- Dashboard-Muster gelten als Abnahmeblocker.

### Verworfen

- Design erst nach Abschluss der Runtime-Arbeiten überarbeiten;
- Designqualität ausschließlich über Accessibility- und Snapshot-Tests definieren;
- technische Bereiche als gleichgewichtige Dashboard-Module darstellen.
