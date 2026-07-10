# OKF-Export

OKF ist das Austausch- und Kurationsformat für geprüfte Ergebnisse aus einem Planungsraum. Es ist kein Rohformat des Gesprächs.

## Exportierbar

- Learning Designs,
- Knowledge Proposals,
- Methoden- und Didaktikmuster,
- Quellenpakete,
- Capability Proposals,
- Materialpakete,
- exemplarische Planungsräume ohne sensible Daten.

## Nicht exportierbar

- rohe Chatverläufe,
- interne Service Requests,
- technische Logs,
- private Reflexionen ohne Freigabe,
- personenbezogene Informationen,
- sensible Lerngruppenbeschreibungen.

## Freigabe

Ein OKF-Export braucht eine explizite Exportfreigabe. Vor dem Export werden sensible Inhalte regelbasiert geprüft. Funde mit `block_export` verhindern den Export, bis sie entschärft sind.

## Format

OKF wird als Markdown mit YAML-Frontmatter vorbereitet. Der aktuelle MVP erzeugt `learning_design`-Vorschläge mit kuratiertem Denkstand.

```yaml
type: learning_design
status: proposal
source_status: teacher_generated_review_needed
contains_raw_chat: false
```

## Qualitätsgrenze

OKF soll professionelles pädagogisches Wissen transportieren. Es darf keine Suchbewegungen, Missverständnisse oder unfertigen privaten Abwägungen als fertige Erkenntnis ausgeben.
