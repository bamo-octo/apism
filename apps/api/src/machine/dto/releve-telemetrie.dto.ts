import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * Releve envoye par la sonde embarquee de la machine a cafe.
 * C'est le cas d'usage type du flow `client_credentials` : aucun utilisateur
 * n'est present derriere l'appel, seule une machine s'authentifie.
 */
export class ReleveTelemetrieDto {
  @ApiProperty({ example: 1750, description: "Niveau d'eau mesure, en millilitres" })
  @IsNumber()
  @Min(0)
  @Max(10_000)
  eauMl!: number;

  @ApiProperty({ example: 420, description: 'Niveau de grains mesure, en grammes' })
  @IsNumber()
  @Min(0)
  @Max(10_000)
  grainsG!: number;

  @ApiProperty({ example: 900, description: 'Niveau de lait mesure, en millilitres' })
  @IsNumber()
  @Min(0)
  @Max(10_000)
  laitMl!: number;

  @ApiPropertyOptional({ example: 40, description: 'Remplissage du bac a marc, en grammes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000)
  marcG?: number;

  @ApiProperty({ example: 92.5, description: 'Temperature du groupe, en degres Celsius' })
  @IsNumber()
  @Min(0)
  @Max(200)
  temperatureC!: number;

  @ApiPropertyOptional({ example: true, description: 'La machine est-elle operationnelle ?' })
  @IsOptional()
  @IsBoolean()
  enService?: boolean;
}
