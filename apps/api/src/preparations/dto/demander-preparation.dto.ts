import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CATALOGUE } from '../../boissons/boisson.js';

const IDS_BOISSONS = CATALOGUE.map((boisson) => boisson.id);

export class DemanderPreparationDto {
  @IsIn(IDS_BOISSONS, { message: 'Cette boisson ne figure pas au catalogue.' })
  idBoisson!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  sucres?: number;
}
