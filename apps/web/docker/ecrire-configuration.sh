#!/bin/sh
# Ecrit configuration.json a partir des variables d'environnement du conteneur.
# Execute par l'entrypoint de l'image nginx, avant le demarrage du serveur.
set -eu

export WEB_URL_API="${WEB_URL_API:-http://localhost:8082/mybrew}"
export WEB_ETAPE="${WEB_ETAPE:-Architecture finale}"
export WEB_AUTHENTIFICATION_ACTIVEE="${WEB_AUTHENTIFICATION_ACTIVEE:-true}"
export WEB_KEYCLOAK_AUTORITE="${WEB_KEYCLOAK_AUTORITE:-http://localhost:8080/realms/mybrew}"
export WEB_KEYCLOAK_CLIENT_ID="${WEB_KEYCLOAK_CLIENT_ID:-mybrew-spa}"
export WEB_KEYCLOAK_SCOPES="${WEB_KEYCLOAK_SCOPES:-openid profile email boisson:preparer machine:entretenir statistiques:lire}"
export WEB_CLE_API_GRAVITEE="${WEB_CLE_API_GRAVITEE:-}"

envsubst < /modeles/configuration.json.modele > /usr/share/nginx/html/configuration.json

echo "configuration.json genere :"
cat /usr/share/nginx/html/configuration.json
