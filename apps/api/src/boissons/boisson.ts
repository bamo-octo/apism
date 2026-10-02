export interface Boisson {
  id: string;
  libelle: string;
  description: string;
  intensite: number;
  doseEauMl: number;
  doseGrainsG: number;
  doseLaitMl: number;
  permission?: string;
}
