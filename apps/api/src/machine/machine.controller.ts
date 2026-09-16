import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesRequis, ScopesRequis, UtilisateurCourant } from '../securite/decorateurs.js';
import { ROLES, SCOPES, type Utilisateur } from '../securite/utilisateur.js';
import { OperationEntretienDto } from './dto/operation-entretien.dto.js';
import { ReleveTelemetrieDto } from './dto/releve-telemetrie.dto.js';
import { EtatMachine } from './etat-machine.js';
import { MachineService } from './machine.service.js';

@ApiTags('Machine')
@ApiBearerAuth()
@Controller('machine')
export class MachineController {
  constructor(private readonly machine: MachineService) {}

  /** Tout utilisateur authentifie peut consulter l'etat de la machine. */
  @Get('etat')
  @ApiOperation({ summary: 'Etat courant de la machine (jeton requis)' })
  @ApiOkResponse({ type: EtatMachine })
  etat(): EtatMachine {
    return this.machine.etat();
  }

  /** Reserve aux techniciens : role metier ET scope de l'application. */
  @Post('entretien')
  @RolesRequis(ROLES.technicien)
  @ScopesRequis(SCOPES.entretenirMachine)
  @ApiOperation({ summary: "Operations d'entretien (role technicien)" })
  @ApiOkResponse({ type: EtatMachine })
  entretenir(
    @Body() operations: OperationEntretienDto,
    @UtilisateurCourant() utilisateur: Utilisateur | undefined,
  ): EtatMachine {
    void utilisateur;
    return this.machine.entretenir(operations);
  }

  /**
   * Reserve a la sonde embarquee : aucun role utilisateur n'est exige, seul le
   * scope `machine:telemetrie` obtenu en `client_credentials`.
   */
  @Post('telemetrie')
  @HttpCode(HttpStatus.ACCEPTED)
  @ScopesRequis(SCOPES.envoyerTelemetrie)
  @ApiOperation({ summary: 'Releve de la sonde machine (flow client_credentials)' })
  @ApiOkResponse({ type: EtatMachine })
  enregistrerTelemetrie(@Body() releve: ReleveTelemetrieDto): EtatMachine {
    return this.machine.enregistrerTelemetrie(releve);
  }
}
