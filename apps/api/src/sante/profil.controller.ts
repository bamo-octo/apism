import { Controller, Get, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UtilisateurCourant } from '../securite/decorateurs.js';
import type { Utilisateur } from '../securite/utilisateur.js';

/** En-tetes ajoutes par la gateway Gravitee, affiches a titre pedagogique. */
const EN_TETES_GATEWAY = [
  'x-gravitee-transaction-id',
  'x-gravitee-request-id',
  'x-mybrew-passe-par-la-gateway',
  'x-mybrew-plan',
] as const;

@ApiTags('Technique')
@ApiBearerAuth()
@Controller('moi')
export class ProfilController {
  /**
   * Renvoie ce que l'API a compris du jeton presente.
   * C'est l'endpoint de debug le plus utile du TP : il montre les roles, les
   * scopes, le client OAuth a l'origine de l'appel et si la requete est bien
   * passee par la gateway.
   */
  @Get()
  @ApiOperation({ summary: "Ce que l'API sait de l'appelant (jeton requis)" })
  profil(
    @UtilisateurCourant() utilisateur: Utilisateur | undefined,
    @Headers() enTetes: Record<string, string>,
  ) {
    const enTetesGateway = Object.fromEntries(
      EN_TETES_GATEWAY.filter((nom) => enTetes[nom] !== undefined).map((nom) => [nom, enTetes[nom]]),
    );

    return {
      authentifie: utilisateur !== undefined,
      utilisateur: utilisateur ?? null,
      passeParLaGateway: Object.keys(enTetesGateway).length > 0,
      enTetesGateway,
    };
  }
}
