import { Body, Controller, Get, Post } from '@nestjs/common';
import { UtilisateurCourant } from '../utilisateurs/utilisateur-courant.js';
import type { Utilisateur } from '../utilisateurs/utilisateur.js';
import { DemanderPreparationDto } from './dto/demander-preparation.dto.js';
import type { Preparation } from './preparation.js';
import { PreparationsService } from './preparations.service.js';

@Controller('preparations')
export class PreparationsController {
  constructor(private readonly preparations: PreparationsService) {}

  @Post()
  preparer(
    @Body() demande: DemanderPreparationDto,
    @UtilisateurCourant() utilisateur: Utilisateur,
  ): Preparation {
    return this.preparations.preparer(demande, utilisateur);
  }

  @Get()
  lister(@UtilisateurCourant() utilisateur: Utilisateur): Preparation[] {
    return this.preparations.lister(utilisateur);
  }
}
