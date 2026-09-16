import { ApiProperty } from '@nestjs/swagger';

export class Boisson {
  @ApiProperty({ example: 'espresso' })
  identifiant!: string;

  @ApiProperty({ example: 'Espresso' })
  libelle!: string;

  @ApiProperty({ example: 'Court et serre, le classique du lundi matin.' })
  description!: string;

  @ApiProperty({ example: 4, description: 'Intensite de 1 a 5' })
  intensite!: number;

  @ApiProperty({ example: 40, description: "Volume d'eau utilise, en millilitres" })
  doseEauMl!: number;

  @ApiProperty({ example: 8, description: 'Quantite de grains utilisee, en grammes' })
  doseGrainsG!: number;

  @ApiProperty({ example: 0, description: 'Quantite de lait utilisee, en millilitres' })
  doseLaitMl!: number;
}

/** Catalogue en dur : le TP n'a volontairement aucune base de donnees. */
export const CATALOGUE: readonly Boisson[] = [
  {
    identifiant: 'ristretto',
    libelle: 'Ristretto',
    description: 'Tres court, pour les jours de mise en production.',
    intensite: 5,
    doseEauMl: 25,
    doseGrainsG: 8,
    doseLaitMl: 0,
  },
  {
    identifiant: 'espresso',
    libelle: 'Espresso',
    description: 'Court et serre, le classique du lundi matin.',
    intensite: 4,
    doseEauMl: 40,
    doseGrainsG: 8,
    doseLaitMl: 0,
  },
  {
    identifiant: 'lungo',
    libelle: 'Lungo',
    description: 'Allonge, pour les reunions qui debordent.',
    intensite: 3,
    doseEauMl: 110,
    doseGrainsG: 8,
    doseLaitMl: 0,
  },
  {
    identifiant: 'cappuccino',
    libelle: 'Cappuccino',
    description: 'Espresso, lait chaud et mousse generreuse.',
    intensite: 3,
    doseEauMl: 40,
    doseGrainsG: 8,
    doseLaitMl: 120,
  },
  {
    identifiant: 'latte-macchiato',
    libelle: 'Latte macchiato',
    description: 'Beaucoup de lait, un peu de cafe, zero remords.',
    intensite: 2,
    doseEauMl: 40,
    doseGrainsG: 7,
    doseLaitMl: 200,
  },
  {
    identifiant: 'chocolat-chaud',
    libelle: 'Chocolat chaud',
    description: 'Pour celles et ceux qui ne carburent pas a la cafeine.',
    intensite: 1,
    doseEauMl: 60,
    doseGrainsG: 0,
    doseLaitMl: 150,
  },
];

export const trouverBoisson = (identifiant: string): Boisson | undefined =>
  CATALOGUE.find((boisson) => boisson.identifiant === identifiant);
