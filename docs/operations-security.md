# Betrieb, Rollen und Secrets

Dieses Dokument bündelt die noch offenen produktiven Betriebsentscheidungen. Es ersetzt keine spätere Sicherheitsprüfung, macht aber die nächste Umsetzungsschwelle explizit.

## Authentifizierung

Für lokale Entwicklung genügt ein Ein-Nutzer-Modus. Für Schul- oder Team-Betrieb braucht die App eine echte Authentifizierung, bevorzugt über eine institutionelle Identitätsschicht wie OIDC/Keycloak oder eine vergleichbare Schulträgerlösung.

## Rollen

Vorgesehene Rollen:

- Owner: verwaltet Planungsraum, Freigaben und Löschung,
- Participant: denkt und schreibt im Planungsraum mit,
- Viewer: liest Denkstand und Materialien,
- Reviewer: prüft Materialien und Exporte,
- Admin: verwaltet Runtimes, Provider, Secrets und Instanzregeln.

Der Critical Friend ist keine Benutzerrolle, sondern ein Systemakteur im Planungsraum.

## Secret-Store

Secrets gehören nicht in Chat, Workspace, Git oder Export. Für lokale Tests darf `.env` verwendet werden, wenn sie nicht eingecheckt wird. Für produktive Deployments sind vorgesehen:

- Docker Secrets,
- verschlüsselte Datenbankfelder,
- Vault oder Secret-Manager,
- admin-only Integrationsoberfläche.

## Datenaufbewahrung und Löschung

Planungsräume brauchen Status und Lebenszyklus:

- aktiv,
- archiviert,
- exportiert,
- gelöscht.

Löschung muss Workspace-Dateien, Metadaten, Exportfreigaben und eventuell erzeugte Materialien einschließen. Externe Ablagen wie Nextcloud müssen separat betrachtet werden.

## Mandanten- und Schultrennung

Produktiver Betrieb braucht eine klare Trennung nach Schule, Organisation oder Instanz. Workspaces, Exporte, Providerfreigaben und Rollen dürfen nicht mandantenübergreifend sichtbar sein.

## Quellenstrategie

Fachliche Aussagen müssen auf prüfbare Quellen gestützt werden. Die App darf keine wissenschaftlich unbelegten Wirksamkeitsversprechen machen. Quellenpakete sollten als kuratierte Materialien sichtbar und exportierbar sein.

## Lizenz- und OER-Metadaten

Materialien und OKF-Pakete brauchen Lizenzfelder. Mindestens vorzusehen sind Lizenz, Autorenschaft, Quelle, Änderungsdatum und Freigabestatus.
