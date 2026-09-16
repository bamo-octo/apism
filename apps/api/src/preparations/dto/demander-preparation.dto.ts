import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CATALOGUE } from '../../boissons/boisson.js';

const IDENTIFIANTS_BOISSONS = CATALOGUE.map((boisson) => boisson.identifiant);

export class DemanderPreparationDto {
  @ApiProperty({ example: 'espresso', enum: IDENTIFIANTS_BOISSONS })
  @IsIn(IDENTIFIANTS_BOISSONS, { message: 'Cette boisson ne figure pas au catalogue.' })
  identifiantBoisson!: string;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 3, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  sucres?: number;
}
