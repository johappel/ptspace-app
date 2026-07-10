# opencode-Testimage

Dieses Image ist für den produktionsnahen Harness-Test vorgesehen. Es ist nicht Teil des normalen App-Stacks und erhält keine Secrets, keine Host-Verzeichnisse und keinen Docker-Socket.

## Bauen

```powershell
docker build --build-arg OPENCODE_VERSION=1.17.13 -f docker/opencode/Dockerfile -t ptspace/opencode-test:1.17.13 .
```

## Prüfen

```powershell
docker run --rm ptspace/opencode-test:1.17.13 --version
```

## Verwendung im Backend-Test

```powershell
$env:PTSPACE_HARNESS="opencode-docker"
$env:PTSPACE_REAL_HARNESS_ENABLED="true"
$env:PTSPACE_OPENCODE_RUNNER="docker"
$env:PTSPACE_OPENCODE_DOCKER_IMAGE="ptspace/opencode-test:1.17.13"
$env:PTSPACE_OPENCODE_ALLOW_NETWORK="false"
pnpm --filter @ptspace/backend dev
```

Der Test darf nur mit einem nicht-sensiblen Planungsraum laufen. Netzwerk- und Providerfreigaben bleiben separate Admin-Entscheidungen.
