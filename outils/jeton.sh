#!/usr/bin/env bash
#
# Imprime un jeton d'acces Keycloak, pour pouvoir appeler l'API a la main.
#
#   ./outils/jeton.sh                       # alice, scopes par defaut
#   ./outils/jeton.sh david statistiques:lire
#   ./outils/jeton.sh --sonde               # flow client_credentials
#   ./outils/jeton.sh --claims alice        # affiche le contenu du jeton
#
# Exemple d'utilisation :
#   curl -H "Authorization: Bearer $(./outils/jeton.sh alice)" \
#        http://localhost:8082/mybrew/machine/etat
set -euo pipefail

URL_KEYCLOAK="${URL_KEYCLOAK:-http://localhost:8080}"
REALM="${REALM:-mybrew}"
CLIENT_SPA="${CLIENT_SPA:-mybrew-spa}"
CLIENT_SONDE="${CLIENT_SONDE:-mybrew-sonde}"
SECRET_SONDE="${SECRET_SONDE:-sonde-secret-de-formation}"
MOT_DE_PASSE="${MOT_DE_PASSE:-mybrew}"

URL_JETON="${URL_KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token"

afficher_les_claims=0
if [[ "${1:-}" == "--claims" ]]; then
  afficher_les_claims=1
  shift
fi

demander() {
  # Le flow « password » n'est active que pour la formation : il evite d'ouvrir
  # un navigateur juste pour tester une route en ligne de commande. En vrai, la
  # SPA utilise Authorization Code + PKCE.
  curl -sS -X POST "$URL_JETON" "$@" |
    python3 -c '
import json, sys
charge = json.load(sys.stdin)
if "access_token" not in charge:
    sys.exit(f"Keycloak a refuse la demande : {charge}")
print(charge["access_token"])
'
}

if [[ "${1:-}" == "--sonde" ]]; then
  jeton=$(demander \
    -d grant_type=client_credentials \
    -d "client_id=${CLIENT_SONDE}" \
    -d "client_secret=${SECRET_SONDE}" \
    -d "scope=${2:-machine:telemetrie}")
else
  utilisateur="${1:-alice}"
  scopes="${2:-openid profile email boisson:preparer machine:entretenir statistiques:lire}"
  jeton=$(demander \
    -d grant_type=password \
    -d "client_id=${CLIENT_SPA}" \
    -d "username=${utilisateur}" \
    -d "password=${MOT_DE_PASSE}" \
    -d "scope=${scopes}")
fi

if [[ "$afficher_les_claims" == 1 ]]; then
  printf '%s' "$jeton" | python3 -c '
import base64, json, sys
charge = sys.stdin.read().split(".")[1]
charge += "=" * (-len(charge) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(charge)), indent=2, ensure_ascii=False))
'
else
  printf '%s\n' "$jeton"
fi
