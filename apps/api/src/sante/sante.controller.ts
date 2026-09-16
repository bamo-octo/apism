import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../securite/decorateurs.js';

interface Sante {
  statut: 'ok';
  application: string;
  horodatage: string;
  /** Utile pendant le TP : indique si l'API valide les jetons. */
  securiteActivee: boolean;
}

@ApiTags('Technique')
@Controller('sante')
export class SanteController {
  /** Sonde de sante : doit rester publique pour Docker et Gravitee. */
  @Public()
  @Get()
  @ApiOperation({ summary: "Sonde de sante de l'API (route publique)" })
  sante(): Sante {
    return {
      statut: 'ok',
      application: 'mybrew-api',
      horodatage: new Date().toISOString(),
      securiteActivee: (process.env.SECURITE_ACTIVEE ?? 'true') !== 'false',
    };
  }
}
