import { IsInt, IsNotEmpty, IsString, Matches, Max, Min } from 'class-validator';
import type { Boisson } from '../boisson.js';

export class BoissonDto implements Boisson {
  @Matches(/^[a-z0-9-]+$/, { message: "L'identifiant ne contient que des minuscules, chiffres et tirets." })
  id!: string;

  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  intensite!: number;

  @IsInt()
  @Min(0)
  doseEauMl!: number;

  @IsInt()
  @Min(0)
  doseGrainsG!: number;

  @IsInt()
  @Min(0)
  doseLaitMl!: number;
}
