import { ApiProperty } from '@nestjs/swagger';

export class NiveauReservoir {
  @ApiProperty({ example: 1800 })
  actuel!: number;

  @ApiProperty({ example: 2000 })
  capacite!: number;

  @ApiProperty({ example: 'ml' })
  unite!: 'ml' | 'g';

  @ApiProperty({ example: 90, description: 'Pourcentage de remplissage' })
  pourcentage!: number;
}

export class EtatMachine {
  @ApiProperty({ example: 'MYBREW-001' })
  numeroDeSerie!: string;

  @ApiProperty({ example: 'Cuisine du 2eme etage' })
  emplacement!: string;

  @ApiProperty({ example: true })
  enService!: boolean;

  @ApiProperty({ type: NiveauReservoir })
  eau!: NiveauReservoir;

  @ApiProperty({ type: NiveauReservoir })
  grains!: NiveauReservoir;

  @ApiProperty({ type: NiveauReservoir })
  lait!: NiveauReservoir;

  @ApiProperty({ type: NiveauReservoir, description: 'Bac a marc de cafe' })
  bacAMarc!: NiveauReservoir;

  @ApiProperty({ example: 92.5, description: 'Temperature du groupe, en degres Celsius' })
  temperatureC!: number;

  @ApiProperty({ example: '2026-09-15T07:12:00.000Z', nullable: true })
  derniereMaintenance!: string | null;

  @ApiProperty({
    example: '2026-09-15T09:30:00.000Z',
    nullable: true,
    description: "Dernier releve envoye par la sonde de la machine (flow client_credentials)",
  })
  derniereTelemetrie!: string | null;

  @ApiProperty({ example: ['Niveau de lait bas'], isArray: true, type: String })
  alertes!: string[];
}
