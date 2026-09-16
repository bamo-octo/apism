import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolesRequis, ScopesRequis, UtilisateurCourant } from '../securite/decorateurs.js';
import { ROLES, SCOPES, type Utilisateur } from '../securite/utilisateur.js';
import { DemanderPreparationDto } from './dto/demander-preparation.dto.js';
import { Preparation } from './preparation.js';
import { PreparationsService } from './preparations.service.js';

@ApiTags('Preparations')
@ApiBearerAuth()
@Controller('preparations')
export class PreparationsController {
  constructor(private readonly preparations: PreparationsService) {}

  /**
   * Couler une boisson. C'est LA route que les participants vont proteger,
   * limiter en debit puis exposer derriere un plan Gravitee.
   */
  @Post()
  @RolesRequis(ROLES.buveur)
  @ScopesRequis(SCOPES.preparerBoisson)
  @ApiOperation({ summary: 'Couler une boisson (role buveur)' })
  @ApiOkResponse({ type: Preparation })
  preparer(
    @Body() demande: DemanderPreparationDto,
    @UtilisateurCourant() utilisateur: Utilisateur | undefined,
  ): Preparation {
    return this.preparations.preparer(demande, utilisateur);
  }

  /**
   * Par defaut, chacun ne voit que ses propres preparations.
   * Un administrateur peut demander l'historique complet.
   */
  @Get()
  @ApiOperation({ summary: 'Historique des preparations (les miennes par defaut)' })
  @ApiQuery({
    name: 'toutes',
    required: false,
    description: "Historique complet (role administrateur requis)",
  })
  @ApiOkResponse({ type: Preparation, isArray: true })
  lister(
    @UtilisateurCourant() utilisateur: Utilisateur | undefined,
    @Query('toutes') toutes?: string,
  ): Preparation[] {
    const demandeToutes = toutes === 'true';
    const estAdministrateur = utilisateur?.roles.includes(ROLES.administrateur) ?? true;

    return this.preparations.lister(utilisateur, demandeToutes && estAdministrateur);
  }

  @Delete()
  @RolesRequis(ROLES.administrateur)
  @ApiOperation({ summary: "Purger l'historique (role administrateur)" })
  purger(): { nombreSupprime: number } {
    return this.preparations.purger();
  }
}
