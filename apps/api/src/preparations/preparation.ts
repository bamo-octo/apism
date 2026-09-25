import type { Utilisateur } from '../utilisateurs/utilisateur.js';

export interface Preparation {
  id: string;
  idBoisson: string;
  libelleBoisson: string;
  auteur: Utilisateur;
  horodatage: string;
  sucres: number;
}
