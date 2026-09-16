/** Types partages avec l'API MyBrew (voir apps/api/src). */

export interface Boisson {
  identifiant: string;
  libelle: string;
  description: string;
  intensite: number;
  doseEauMl: number;
  doseGrainsG: number;
  doseLaitMl: number;
}

export interface NiveauReservoir {
  actuel: number;
  capacite: number;
  unite: 'ml' | 'g';
  pourcentage: number;
}

export interface EtatMachine {
  numeroDeSerie: string;
  emplacement: string;
  enService: boolean;
  eau: NiveauReservoir;
  grains: NiveauReservoir;
  lait: NiveauReservoir;
  bacAMarc: NiveauReservoir;
  temperatureC: number;
  derniereMaintenance: string | null;
  derniereTelemetrie: string | null;
  alertes: string[];
}

export interface Preparation {
  identifiant: string;
  identifiantBoisson: string;
  libelleBoisson: string;
  auteur: { identifiant: string; nomUtilisateur: string; nomAffiche: string };
  horodatage: string;
  sucres: number;
  clientOAuth: string;
}

export interface Statistiques {
  nombreTotal: number;
  parUtilisateur: {
    nomUtilisateur: string;
    nomAffiche: string;
    nombreDePreparations: number;
    dernierePreparation: string;
  }[];
  parBoisson: Record<string, number>;
}

export interface OperationEntretien {
  remplirEau?: boolean;
  remplirGrains?: boolean;
  remplirLait?: boolean;
  viderBacAMarc?: boolean;
  detartrer?: boolean;
}

export interface Profil {
  authentifie: boolean;
  utilisateur: {
    identifiant: string;
    nomUtilisateur: string;
    nomAffiche: string;
    courriel?: string;
    roles: string[];
    scopes: string[];
    clientOAuth: string;
    estUnService: boolean;
  } | null;
  passeParLaGateway: boolean;
  enTetesGateway: Record<string, string>;
}
