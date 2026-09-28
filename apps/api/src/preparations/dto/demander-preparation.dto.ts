import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class DemanderPreparationDto {
  @IsString()
  idBoisson!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  sucres?: number;
}
