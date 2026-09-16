#!/usr/bin/env bash
#
# Batterie de tests de l'architecture finale du TP MyBrew.
#
# Elle verifie, de bout en bout, que la gateway et l'API se comportent comme
# attendu : qui peut appeler quoi, avec quel jeton, et ce qui se passe quand on
# depasse les limites.
#
#   ./outils/tester-securite.sh                          # via la gateway
#   ./outils/tester-securite.sh http://localhost:3000    # en direct sur l'API
#
# Code de sortie : 0 si tout passe, sinon le nombre d'echecs.
set -uo pipefail

BASE="${1:-${URL_API:-http://localhost:8082/mybrew}}"
BASE="${BASE%/}"
CLE_API="${CLE_API:-mybrew-cle-de-formation}"
LIMITE_DEBIT_PAR_MINUTE="${LIMITE_DEBIT_PAR_MINUTE:-3}"

racine="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
jeton_de() { "$racine/outils/jeton.sh" "$@"; }

if [[ -t 1 ]]; then
  VERT=$'\e[32m'; ROUGE=$'\e[31m'; GRIS=$'\e[90m'; GRAS=$'\e[1m'; FIN=$'\e[0m'
else
  VERT=''; ROUGE=''; GRIS=''; GRAS=''; FIN=''
fi

reussites=0
echecs=0
reponse=$(mktemp)
trap 'rm -f "$reponse"' EXIT

titre() { printf '\n%s%s%s\n' "$GRAS" "$1" "$FIN"; }

# verifier <libelle> <code attendu> <methode> <chemin> <en-tete auth> [corps json]
verifier() {
  local libelle=$1 attendu=$2 methode=$3 chemin=$4 auth=$5 corps=${6:-}
  local args=(-sS -o "$reponse" -w '%{http_code}' -X "$methode" "${BASE}${chemin}")

  [[ -n $auth ]] && args+=(-H "$auth")
  [[ -n $corps ]] && args+=(-H 'Content-Type: application/json' -d "$corps")

  local code
  code=$(curl "${args[@]}")

  if [[ "$code" == "$attendu" ]]; then
    printf '  %sok%s   %-58s %s\n' "$VERT" "$FIN" "$libelle" "$code"
    reussites=$((reussites + 1))
  else
    printf '  %sKO%s   %-58s %s (attendu %s)\n' "$ROUGE" "$FIN" "$libelle" "$code" "$attendu"
    printf '       %s%s%s\n' "$GRIS" "$(head -c 200 "$reponse")" "$FIN"
    echecs=$((echecs + 1))
  fi
}

printf '%sCible : %s%s\n' "$GRAS" "$BASE" "$FIN"

# -----------------------------------------------------------------------------
# Jetons
# -----------------------------------------------------------------------------
titre 'Obtention des jetons aupres de Keycloak'

# alice ne dispose que du role « buveur », mais elle demande tous les scopes :
# c'est ce qui permet de montrer la difference entre role et scope.
jeton_alice=$(jeton_de alice 'openid profile email boisson:preparer machine:entretenir statistiques:lire')
jeton_alice_sans_scope=$(jeton_de alice 'openid profile email')
jeton_bruno=$(jeton_de bruno 'openid profile email boisson:preparer')
jeton_chloe=$(jeton_de chloe 'openid profile email boisson:preparer machine:entretenir')
jeton_david=$(jeton_de david 'openid profile email boisson:preparer statistiques:lire')
jeton_sonde=$(jeton_de --sonde)
printf '  %s5 utilisateurs + la sonde%s\n' "$GRIS" "$FIN"

AUTH_ALICE="Authorization: Bearer $jeton_alice"
AUTH_ALICE_SANS_SCOPE="Authorization: Bearer $jeton_alice_sans_scope"
AUTH_BRUNO="Authorization: Bearer $jeton_bruno"
AUTH_CHLOE="Authorization: Bearer $jeton_chloe"
AUTH_DAVID="Authorization: Bearer $jeton_david"
AUTH_SONDE="Authorization: Bearer $jeton_sonde"

# On remet les reservoirs a niveau : les tests suivants doivent pouvoir couler
# du cafe quel que soit l'etat laisse par la session precedente.
curl -sS -o /dev/null -X POST "${BASE}/machine/entretien" -H "$AUTH_CHLOE" \
  -H 'Content-Type: application/json' \
  -d '{"remplirEau":true,"remplirGrains":true,"remplirLait":true,"viderBacAMarc":true,"detartrer":true}'

# -----------------------------------------------------------------------------
titre '1. Sans aucune identification, tout est refuse'
verifier 'GET /boissons sans jeton'          401 GET  /boissons     ''
verifier 'GET /machine/etat sans jeton'      401 GET  /machine/etat ''
verifier 'GET /machine/etat, jeton bidon'    401 GET  /machine/etat 'Authorization: Bearer ceci-nest-pas-un-jeton'

# -----------------------------------------------------------------------------
titre '2. Authentification : un jeton valide ouvre les routes de lecture'
verifier 'GET /machine/etat (alice)'         200 GET  /machine/etat "$AUTH_ALICE"
verifier 'GET /preparations (alice)'         200 GET  /preparations "$AUTH_ALICE"
verifier 'GET /moi (alice)'                  200 GET  /moi          "$AUTH_ALICE"

# -----------------------------------------------------------------------------
titre '3. Autorisation par scope : ce que l application a le droit de demander'
verifier 'POST /preparations avec le scope'  201 POST /preparations "$AUTH_ALICE" '{"identifiantBoisson":"espresso","sucres":1}'
verifier 'POST /preparations sans le scope'  403 POST /preparations "$AUTH_ALICE_SANS_SCOPE" '{"identifiantBoisson":"espresso"}'

# -----------------------------------------------------------------------------
titre '4. Autorisation par role : ce que la personne a le droit de faire'
# alice a demande le scope machine:entretenir, mais elle n est pas technicienne.
verifier 'POST /machine/entretien (alice)'   403 POST /machine/entretien "$AUTH_ALICE" '{"remplirEau":true}'
verifier 'POST /machine/entretien (chloe)'   201 POST /machine/entretien "$AUTH_CHLOE" '{"remplirEau":true,"viderBacAMarc":true}'
verifier 'GET /statistiques (alice)'         403 GET  /statistiques "$AUTH_ALICE"
verifier 'GET /statistiques (david, admin)'  200 GET  /statistiques "$AUTH_DAVID"

# -----------------------------------------------------------------------------
titre '5. Client credentials : la sonde n a acces qu a la telemetrie'
verifier 'POST /machine/telemetrie (sonde)'  202 POST /machine/telemetrie "$AUTH_SONDE" '{"eauMl":1800,"grainsG":450,"laitMl":900,"marcG":30,"temperatureC":92.1}'
verifier 'GET /machine/etat (sonde)'         401 GET  /machine/etat "$AUTH_SONDE"
verifier 'POST /machine/telemetrie (alice)'  401 POST /machine/telemetrie "$AUTH_ALICE" '{"eauMl":10,"grainsG":10,"laitMl":10,"temperatureC":90}'

# -----------------------------------------------------------------------------
if [[ "$BASE" == *:8082* ]]; then
  titre '6. Plan par cle d API : lecture des routes publiques uniquement'
  verifier 'GET /boissons avec la cle'       200 GET  /boissons     "X-Gravitee-Api-Key: $CLE_API"
  verifier 'GET /sante avec la cle'          200 GET  /sante        "X-Gravitee-Api-Key: $CLE_API"
  verifier 'GET /machine/etat avec la cle'   403 GET  /machine/etat "X-Gravitee-Api-Key: $CLE_API"
  verifier 'GET /boissons, mauvaise cle'     401 GET  /boissons     'X-Gravitee-Api-Key: cle-inventee'

  titre "7. Rate limiting : ${LIMITE_DEBIT_PAR_MINUTE} boissons par minute et par utilisateur"
  servies=0
  dernier_code=''
  for _ in $(seq 1 $((LIMITE_DEBIT_PAR_MINUTE + 1))); do
    dernier_code=$(curl -sS -o "$reponse" -w '%{http_code}' -X POST "${BASE}/preparations" \
      -H "$AUTH_BRUNO" -H 'Content-Type: application/json' \
      -d '{"identifiantBoisson":"lungo"}')
    [[ "$dernier_code" == '201' ]] && servies=$((servies + 1))
  done

  printf '  %s%s boisson(s) servie(s) a bruno avant blocage%s\n' "$GRIS" "$servies" "$FIN"
  if [[ "$dernier_code" == '429' ]]; then
    printf '  %sok%s   %-58s %s\n' "$VERT" "$FIN" "l appel suivant est bloque par la gateway" "$dernier_code"
    reussites=$((reussites + 1))
  else
    printf '  %sKO%s   %-58s %s (attendu 429)\n' "$ROUGE" "$FIN" "l appel suivant est bloque par la gateway" "$dernier_code"
    echecs=$((echecs + 1))
  fi

  # Les compteurs sont annonces au client : la SPA s en sert pour desactiver
  # le bouton et afficher le temps d attente.
  entetes=$(curl -sS -D - -o /dev/null -X POST "${BASE}/preparations" \
    -H "$AUTH_BRUNO" -H 'Content-Type: application/json' \
    -d '{"identifiantBoisson":"lungo"}' | tr -d '\r')

  for entete in X-Rate-Limit-Limit X-Rate-Limit-Remaining; do
    if grep -qi "^${entete}:" <<<"$entetes"; then
      printf '  %sok%s   %-58s %s\n' "$VERT" "$FIN" "en-tete $entete present" \
        "$(grep -i "^${entete}:" <<<"$entetes" | head -1)"
      reussites=$((reussites + 1))
    else
      printf '  %sKO%s   %-58s absent\n' "$ROUGE" "$FIN" "en-tete $entete present"
      echecs=$((echecs + 1))
    fi
  done

  titre '8. Tracabilite : l API sait qu elle est appelee via la gateway'
  passage=$(curl -sS "${BASE}/moi" -H "$AUTH_ALICE" | python3 -c '
import json, sys
charge = json.load(sys.stdin)
entetes = charge.get("enTetesGateway") or {}
print(charge.get("passeParLaGateway"), entetes.get("x-mybrew-plan"))
')
  if [[ "$passage" == "True Utilisateurs MyBrew" ]]; then
    printf '  %sok%s   %-58s %s\n' "$VERT" "$FIN" 'GET /moi annonce le plan utilise' "$passage"
    reussites=$((reussites + 1))
  else
    printf '  %sKO%s   %-58s %s\n' "$ROUGE" "$FIN" 'GET /moi annonce le plan utilise' "$passage"
    echecs=$((echecs + 1))
  fi
fi

# -----------------------------------------------------------------------------
titre '9. Purge de l historique, reservee aux administrateurs'
verifier 'DELETE /preparations (alice)'      403 DELETE /preparations "$AUTH_ALICE"
verifier 'DELETE /preparations (david)'      200 DELETE /preparations "$AUTH_DAVID"

# -----------------------------------------------------------------------------
printf '\n%s%d reussite(s), %d echec(s)%s\n' "$GRAS" "$reussites" "$echecs" "$FIN"
exit "$echecs"
