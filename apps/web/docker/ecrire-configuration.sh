#!/bin/sh
# Ecrit configuration.json a partir des variables d'environnement du conteneur.
# Execute par l'entrypoint de l'image nginx, avant le demarrage du serveur.
set -eu

export WEB_URL_API="${WEB_URL_API:-http://localhost:3000}"
export WEB_KEYCLOAK_AUTORITE="${WEB_KEYCLOAK_AUTORITE:-http://localhost:18080/realms/mybrew}"

envsubst < /modeles/configuration.json.modele > /usr/share/nginx/html/configuration.json

echo "configuration.json genere :"
cat /usr/share/nginx/html/configuration.json
