# Nextcloud-Integration

Nextcloud ist externe Schulablage, nicht interner Denkraum der App.

## Ziel

Lehrkräfte sollen freigegebene Materialien dort ablegen können, wo sie im Schulalltag weiterarbeiten. Die App bleibt aber das System für Planungsraum, Denkstand, Freigaben und Exportfilter.

## Nicht automatisch übertragen

- rohe Chatverläufe,
- private Reflexionen,
- interne Service Requests,
- technische Logs,
- unfertige Entwürfe ohne Freigabe,
- personenbezogene Lerngruppendetails.

## Exportvoraussetzungen

Vor jedem Nextcloud-Export müssen erfüllt sein:

- Material ist als Entwurf oder freigegebenes Material klassifiziert,
- Exportfilter wurde angewendet,
- sensible Hinweise wurden geprüft,
- Lehrkraft hat den konkreten Export bestätigt,
- Zielordner ist durch Instanzkonfiguration erlaubt.

## Technische Grenze

Der Browser spricht nicht direkt mit Nextcloud. Uploads laufen über das Backend, das Rechte, Dateityp, Zielpfad und Exportfreigabe prüft.

## Spätere Umsetzung

Für den MVP bleibt Nextcloud zurückgestellt. Die nächste sinnvolle Stufe ist ein Backend-Adapter mit WebDAV/API-Konfiguration, aber noch ohne automatische Synchronisation ganzer Planungsräume.
