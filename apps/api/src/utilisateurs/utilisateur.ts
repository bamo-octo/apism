export interface Utilisateur {
  id: string;
  nom: string;
}

export const UTILISATEUR_ANONYME: Utilisateur = { id: 'anonyme', nom: 'Anonyme' };
