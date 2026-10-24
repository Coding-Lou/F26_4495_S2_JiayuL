#!/bin/sh
# Writes /runtime-config.js from the container environment, read by
# src/features/auth/authConfig.ts before the application starts. Public
# values only (a public OIDC client has no secret). An unset value is left
# empty, and the application then reports sign-in as unavailable.
set -eu

js_string() {
    printf '%s' "$1" | tr -d '\r\n' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /tmp/runtime-config.js <<JS
window.__OTC_RUNTIME_CONFIG__ = {
  keycloakUrl: "$(js_string "${KEYCLOAK_URL:-}")",
  keycloakRealm: "$(js_string "${KEYCLOAK_REALM:-}")",
  keycloakClientId: "$(js_string "${KEYCLOAK_CLIENT_ID:-}")"
}
JS
