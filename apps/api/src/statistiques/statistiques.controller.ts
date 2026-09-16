import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesRequis, ScopesRequis } from '../securite/decorateurs.js';
import { PreparationsService } from '../preparations/preparations.service.js';
import { Statistiques } from '../preparations/preparation.js';
import { ROLES, SCOPES } from '../securite/utilisateur.js';

@ApiTags('Statistiques')
@ApiBearerAuth()
@Controller('statistiques')
export class StatistiquesController {
  constructor(private readonly preparations: PreparationsService) {}

  /** Le classement des plus gros consommateurs : donnee sensible, role dedie. */
  @Get()
  @RolesRequis(ROLES.administrateur)
  @ScopesRequis(SCOPES.lireStatistiques)
  @ApiOperation({ summary: 'Statistiques de consommation (role administrateur)' })
  @ApiOkResponse({ type: Statistiques })
  statistiques(): Statistiques {
    return this.preparations.statistiques();
  }
}
