/** Types partagés avec l'API MyBrew (voir apps/api/src). */

export interface Boisson {
  id: string;
  libelle: string;
  description: string;
  intensite: number;
  doseEauMl: number;
  doseGrainsG: number;
  doseLaitMl: number;
}

export interface Preparation {
  id: string;
  idBoisson: string;
  libelleBoisson: string;
  auteur: { id: string; nom: string };
  horodatage: string;
  sucres: number;
}
