import { ApiProperty } from '@nestjs/swagger';

export class AuteurPreparation {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  identifiant!: string;

  @ApiProperty({ example: 'alice' })
  nomUtilisateur!: string;

  @ApiProperty({ example: 'Alice Dupont' })
  nomAffiche!: string;
}

export class Preparation {
  @ApiProperty({ example: '3f9a1c2e-8b7d-4a0f-9c11-52e6d7c8b9a0' })
  identifiant!: string;

  @ApiProperty({ example: 'espresso' })
  identifiantBoisson!: string;

  @ApiProperty({ example: 'Espresso' })
  libelleBoisson!: string;

  @ApiProperty({ type: AuteurPreparation })
  auteur!: AuteurPreparation;

  @ApiProperty({ example: '2026-09-15T09:41:12.345Z' })
  horodatage!: string;

  @ApiProperty({ example: 1, description: 'Nombre de sucres demandes' })
  sucres!: number;

  @ApiProperty({
    example: 'mybrew-spa',
    description: "Client OAuth a l'origine de la demande",
  })
  clientOAuth!: string;
}

export class StatistiquesParUtilisateur {
  @ApiProperty({ example: 'alice' })
  nomUtilisateur!: string;

  @ApiProperty({ example: 'Alice Dupont' })
  nomAffiche!: string;

  @ApiProperty({ example: 7 })
  nombreDePreparations!: number;

  @ApiProperty({ example: '2026-09-15T09:41:12.345Z' })
  dernierePreparation!: string;
}

export class Statistiques {
  @ApiProperty({ example: 23 })
  nombreTotal!: number;

  @ApiProperty({ type: StatistiquesParUtilisateur, isArray: true })
  parUtilisateur!: StatistiquesParUtilisateur[];

  @ApiProperty({
    example: { espresso: 12, lungo: 6 },
    description: 'Nombre de preparations par boisson',
  })
  parBoisson!: Record<string, number>;
}
