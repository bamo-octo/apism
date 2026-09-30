import type { Utilisateur } from '../utilisateurs/utilisateur.js';

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

export const CATALOGUE: Boisson[] = [
  {
    id: 'ristretto',
    libelle: 'Ristretto',
    description: 'Très court, pour les jours de mise en production.',
    intensite: 5,
    doseEauMl: 25,
    doseGrainsG: 8,
    doseLaitMl: 0,
  },
  {
    id: 'espresso',
    libelle: 'Espresso',
    description: 'Court et serré, le classique du lundi matin.',
    intensite: 4,
    doseEauMl: 40,
    doseGrainsG: 8,
    doseLaitMl: 0,
  },
  {
    id: 'lungo',
    libelle: 'Lungo',
    description: 'Allongé, pour les réunions qui débordent.',
    intensite: 3,
    doseEauMl: 110,
    doseGrainsG: 8,
    doseLaitMl: 0,
  },
  {
    id: 'cappuccino',
    libelle: 'Cappuccino',
    description: 'Espresso, lait chaud et mousse généreuse.',
    intensite: 3,
    doseEauMl: 40,
    doseGrainsG: 8,
    doseLaitMl: 120,
  },
  {
    id: 'latte-macchiato',
    libelle: 'Latte macchiato',
    description: 'Beaucoup de lait, un peu de café, zéro remords.',
    intensite: 2,
    doseEauMl: 40,
    doseGrainsG: 7,
    doseLaitMl: 200,
  },
  {
    id: 'chocolat-chaud',
    libelle: 'Chocolat chaud',
    description: 'Pour celles et ceux qui ne carburent pas à la caféine.',
    intensite: 1,
    doseEauMl: 60,
    doseGrainsG: 0,
    doseLaitMl: 150,
  },
  {
    id: 'cafe-mystere',
    libelle: 'Café mystère',
    description: "Rapporté de voyage par la direction. Personne ne sait ce qu'il contient.",
    intensite: 5,
    doseEauMl: 30,
    doseGrainsG: 9,
    doseLaitMl: 0,
    permission: 'couler-cafe-mystere',
  },
];

export const trouverBoisson = (id: string): Boisson | undefined =>
  CATALOGUE.find((boisson) => boisson.id === id);

/** Une boisson sans permission est ouverte à tous ; sinon, l'utilisateur doit avoir la permission. */
export const peutCommander = (utilisateur: Utilisateur | undefined, boisson: Boisson): boolean =>
  !boisson.permission || (utilisateur?.permissions.includes(boisson.permission) ?? false);
