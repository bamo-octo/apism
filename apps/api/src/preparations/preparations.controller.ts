import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CleApiGuard } from '../cles-api/cle-api.guard.js';
import { UtilisateurCourant } from '../utilisateurs/utilisateur-courant.js';
import type { Utilisateur } from '../utilisateurs/utilisateur.js';
import { DemanderPreparationDto } from './dto/demander-preparation.dto.js';
import type { Preparation } from './preparation.js';
import { PreparationsService } from './preparations.service.js';

@Controller('preparations')
export class PreparationsController {
  constructor(private readonly preparations: PreparationsService) {}

  @Post()
  @UseGuards(CleApiGuard)
  preparer(
    @Body() demande: DemanderPreparationDto,
    @UtilisateurCourant() utilisateur: Utilisateur | undefined,
  ): Preparation {
    return this.preparations.preparer(demande, utilisateur);
  }

  @Get()
  lister(@UtilisateurCourant() utilisateur: Utilisateur | undefined): Preparation[] {
    return this.preparations.lister(utilisateur);
  }
}
