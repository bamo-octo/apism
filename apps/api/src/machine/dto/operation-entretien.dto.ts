import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/** Operations d'entretien reservees aux techniciens. */
export class OperationEntretienDto {
  @ApiPropertyOptional({ example: true, description: "Remplir le reservoir d'eau" })
  @IsOptional()
  @IsBoolean()
  remplirEau?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Remplir le bac a grains' })
  @IsOptional()
  @IsBoolean()
  remplirGrains?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Remplir le reservoir de lait' })
  @IsOptional()
  @IsBoolean()
  remplirLait?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Vider le bac a marc de cafe' })
  @IsOptional()
  @IsBoolean()
  viderBacAMarc?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Lancer un cycle de detartrage' })
  @IsOptional()
  @IsBoolean()
  detartrer?: boolean;
}
