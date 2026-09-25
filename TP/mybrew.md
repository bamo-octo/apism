# MyBrew — état initial

MyBrew gère la machine à café d'une entreprise. Dans cet état de départ,
l'application fait deux choses :

- **Catalogue** (`/`) — la liste des boissons disponibles, avec un bouton
  « Couler » pour en préparer une.
- **Historique** (`/historique`) — la liste des préparations, dans l'ordre
  chronologique inverse.

## Ce qui n'est pas encore en place

Cette version n'a **aucune sécurité** : n'importe qui peut appeler l'API
directement (`http://localhost:3000`), sans jeton, sans rôle, sans limite.
L'API ne sait pas qui commande : les préparations n'ont pas de buveur, et
tout le monde voit donc le même historique. C'est volontaire : c'est le point de départ sur lequel les
étapes suivantes du TP vont construire l'authentification, les autorisations
et la gestion d'API.

## Démarrer

```bash
make demarrer
```

- SPA : <http://localhost:4200>
- API : <http://localhost:3000> (`GET /boissons`, `GET /preparations`,
  `POST /preparations`)

Pour avoir l'autocomplétion dans l'IDE, installez les dépendances :

```bash
make install
```

## Étapes du TP

Chaque étape a une branche de départ et une branche contenant sa solution.

| Étape | Énoncé | Branche de départ | Branche solution |
| --- | --- | --- | --- |
| 1 — Clé d'API | `TP/etape-1-api-key.md` | `etape-1-api-key` | `etape-1-api-key-solution` |
| 2 — Client credentials | `TP/etape-2-client-credentials.md` | `etape-2-client-credentials` | `etape-2-client-credentials-solution` |
| 3 — PKCE | `TP/etape-3-pkce.md` | `etape-3-pkce` | `etape-3-pkce-solution` |
| 4 — Refresh token | `TP/etape-4-refresh-token.md` | `etape-4-refresh-token` | `etape-4-refresh-token-solution` |
| 5 — Device grant | `TP/etape-5-device-grant.md` | `etape-5-device-grant` | `etape-5-device-grant-solution` |
| 6 — Permissions | `TP/etape-6-permissions.md` | `etape-6-permissions` | `etape-6-permissions-solution` |
| 7 — OIDC | `TP/etape-7-oidc.md` | `etape-7-oidc` | `etape-7-oidc-solution` |
| 8 — Token exchange | `TP/etape-8-token-exchange.md` | `etape-8-token-exchange` | `etape-8-token-exchange-solution` |
| 9 — Gateway | `TP/etape-9-gateway.md` | `etape-9-gateway` | `etape-9-gateway-solution` |
| 10 — Quotas | `TP/etape-10-quotas.md` | `etape-10-quotas` | `etape-10-quotas-solution` |
| 11 — Métriques | `TP/etape-11-metriques.md` | `etape-11-metriques` | `etape-11-metriques-solution` |
| 12 — Portail développeur | `TP/etape-12-portail-developpeur.md` | `etape-12-portail-developpeur` | `etape-12-portail-developpeur-solution` |
