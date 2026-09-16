# MyBrew — TP « Sécuriser et Manager son API »

MyBrew gère la machine à café d'une entreprise : on consulte le catalogue, on se
fait couler une boisson, un technicien remplit les réservoirs, un administrateur
regarde qui abuse du cappuccino, et une sonde embarquée publie sa télémétrie.

Cette branche contient **l'état final du TP** : toutes les briques techniques
sont en place et fonctionnent ensemble.

```
Navigateur ──> SPA Angular (nginx, :4200)
     │
     ├──> Keycloak (:8080) ................. Authorization Code + PKCE, OIDC
     │
     └──> Gateway Gravitee (:8082) ──> API NestJS (non exposée)
                                          ▲
Sonde machine ──> Gateway (client_credentials) ┘
```

L'API NestJS n'est **pas** publiée sur la machine hôte : le seul chemin d'accès
est la gateway. C'est le point d'arrivée du TP.

---

## Démarrer

Prérequis : Docker Desktop (ou Docker Engine + Compose v2) et ~6 Go de RAM
disponibles. Rien d'autre — pas besoin de Node en local.

```bash
make demarrer        # ou : docker compose up -d --build
make journaux        # suit l'amorçage de Gravitee (environ une minute)
```

| Service | URL | Identifiants |
| --- | --- | --- |
| SPA MyBrew | <http://localhost:4200> | alice / bruno / chloe / david, mot de passe `mybrew` |
| Gateway Gravitee | <http://localhost:8082/mybrew> | — |
| Console Gravitee | <http://localhost:8084> | `admin` / `admin` |
| Portail développeur | <http://localhost:4100> | `admin` / `admin` |
| API de management | <http://localhost:8083> | `admin` / `admin` |
| Keycloak | <http://localhost:8080> | `admin` / `admin` |

Le fichier `.env` est versionné volontairement : il ne contient que des versions
figées et des secrets de formation, et tout le monde doit démarrer à l'identique.

### Vérifier que tout fonctionne

```bash
make tester
```

25 vérifications de bout en bout : qui peut appeler quoi, avec quel jeton, et ce
qui se passe quand on dépasse les limites. La sortie doit finir par
`25 réussite(s), 0 échec(s)`.

### Autres commandes

```bash
make aide            # liste tous les raccourcis
make etat            # état des conteneurs
make reamorcer       # recrée l'API Gravitee, ses plans et ses souscriptions
make nettoyer        # supprime tout, volumes compris

./outils/jeton.sh alice                    # un jeton d'accès, pour curl
./outils/jeton.sh --claims david           # le contenu du jeton
./outils/jeton.sh --sonde                  # un jeton client_credentials
```

---

## Les personnes, les rôles, les scopes

Un **rôle** dit ce que la personne a le droit de faire. Un **scope** dit ce que
l'application a le droit de demander en son nom. Les deux sont vérifiés, et
séparément : c'est un des points clés du TP.

| Utilisateur | Rôles | Peut… |
| --- | --- | --- |
| `alice` | buveur | se faire couler une boisson, voir son historique |
| `bruno` | buveur | idem — c'est lui qui se fait rattraper par le rate limiting |
| `chloe` | buveur, technicien | en plus : remplir, vider, détartrer |
| `david` | buveur, administrateur | en plus : statistiques et purge de l'historique |

Mot de passe : `mybrew` pour tout le monde.

| Scope | Ce qu'il autorise |
| --- | --- |
| `boisson:preparer` | commander une boisson au nom de l'utilisateur |
| `machine:entretenir` | déclencher les opérations d'entretien |
| `statistiques:lire` | lire les statistiques de consommation |
| `machine:telemetrie` | publier des relevés (réservé à la sonde) |

Les trois premiers sont **optionnels** sur le client `mybrew-spa` : la SPA doit
les demander explicitement. Demander un scope ne donne pas le rôle qui va avec —
`alice` peut demander `machine:entretenir`, l'API lui répondra quand même 403.

---

## Les clients OAuth 2.0

| Client | Type | Flow | Usage |
| --- | --- | --- | --- |
| `mybrew-spa` | public | Authorization Code + PKCE (S256) | la SPA dans le navigateur |
| `mybrew-sonde` | confidentiel | Client Credentials | la sonde de la machine |
| `gravitee-introspection` | confidentiel | — | la gateway, pour introspecter les jetons |

Le flow « password » est aussi activé sur `mybrew-spa`, uniquement pour que
`outils/jeton.sh` puisse récupérer un jeton sans ouvrir de navigateur. Ce n'est
pas une pratique à reproduire en production.

---

## Les plans Gravitee

Un plan, c'est un contrat : une façon de s'authentifier, des limites, et des
souscriptions.

| Plan | Sécurité | Pour qui | Ce qu'il applique |
| --- | --- | --- | --- |
| Utilisateurs MyBrew | JWT (JWKS) | application `SPA MyBrew` | 3 boissons/minute et 20/jour **par utilisateur** |
| Sonde machine | OAuth2 (introspection) | application `Sonde machine à café` | scope `machine:telemetrie` exigé, `POST /machine/telemetrie` uniquement |
| Découverte | Clé d'API | application `Tableau de bord cafétéria` | routes publiques en lecture, 100 appels/jour |

La clé d'API du plan Découverte est fixée à `mybrew-cle-de-formation` pour que
tout le monde ait la même.

Deux plans savent traiter un en-tête `Authorization: Bearer`. Ils sont départagés
par une **règle de sélection** sur le chemin : la télémétrie passe par
l'introspection, tout le reste par la validation locale JWKS.

---

## Ce qu'il y a dans le dépôt

```
apps/api/          API NestJS : catalogue, préparations, machine, statistiques
apps/web/          SPA Angular 22 (standalone, signals, angular-auth-oidc-client)
apps/sonde/        Sonde de la machine : client_credentials, sans dépendance
infra/keycloak/    realm-mybrew.json — importé au démarrage de Keycloak
infra/gravitee/    amorcer.mjs — déclare l'API, les plans, les souscriptions
outils/            jeton.sh, tester-securite.sh
docs/              architecture.md — les choix techniques et leurs pourquoi
```

Aucune base de données applicative : l'état de la machine et l'historique des
préparations vivent en mémoire dans l'API. Redémarrer `api` remet la machine à
neuf, ce qui est pratique entre deux exercices.

Voir [`docs/architecture.md`](docs/architecture.md) pour le détail des choix, les
pièges rencontrés et ce qu'il faudrait changer pour un déploiement réel.

---

## Dépannage

**L'API répond 404 sur <http://localhost:8082/mybrew>**
L'amorçage n'a pas fini, ou a échoué. `docker logs mybrew-amorcage`, puis
`make amorcer` pour le rejouer.

**Le gateway répond 503 sur toutes les routes**
La gateway ne joint pas l'API. Vérifiez `docker compose ps api` : le conteneur
doit être `healthy`.

**Tout répond 401 alors que le jeton semble bon**
Regardez l'onglet Analytics de l'API dans la console Gravitee : le message
d'erreur y est explicite (signature, souscription introuvable, règle de
sélection…). `./outils/jeton.sh --claims alice` affiche le contenu du jeton.

**Le port 4200, 8080 ou 8082 est déjà pris**
Changez le port publié dans `docker-compose.yml`. Attention : `4200` et `8080`
apparaissent aussi dans les URL de redirection Keycloak et dans `.env`.

**Après un `make nettoyer`, Gravitee semble vide**
C'est normal : les volumes MongoDB et Elasticsearch ont été supprimés. Le
conteneur `amorcage` reconstruit tout au démarrage suivant.

---

## Les 10 étapes du TP

Chaque étape aura sa branche, avec l'état de départ prêt à l'emploi.

1. Non sécurisé — la SPA appelle l'API en direct, tout le monde peut tout faire
2. Client Credentials — la sonde s'authentifie en tant que machine
3. Autorisation utilisateur (PKCE) — la SPA obtient un jeton pour l'utilisateur
4. Authentification OIDC — qui est connecté, et comment l'afficher
5. Autorisation utilisateur — rôles et scopes vérifiés côté API
6. API Gateway — Gravitee s'intercale entre la SPA et l'API
7. Rate limiting / quotas — un utilisateur ne monopolise plus la machine
8. Validation OAuth au niveau gateway — les jetons sont vérifiés avant l'API
9. Plans / exposition / souscriptions — le portail développeur et les clés d'API
10. Architecture finale — **cette branche**
