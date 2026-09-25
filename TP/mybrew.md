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
L'API ne sait pas qui commande : chaque préparation est attribuée au buveur
« Anonyme », et tout le monde partage donc le même historique. C'est volontaire : c'est le point de départ sur lequel les
étapes suivantes du TP vont construire l'authentification, les autorisations
et la gestion d'API.

## Démarrer

```bash
make demarrer
```

- SPA : <http://localhost:4200>
- API : <http://localhost:3000> (`GET /boissons`, `GET /preparations`,
  `POST /preparations`)
