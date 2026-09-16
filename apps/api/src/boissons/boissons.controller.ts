import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../securite/decorateurs.js';
import { Boisson, CATALOGUE } from './boisson.js';

@ApiTags('Boissons')
@Controller('boissons')
export class BoissonsController {
  /**
   * Le catalogue reste public : c'est la vitrine de MyBrew, et cela donne un
   * point de comparaison utile avec les routes protegees.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Catalogue des boissons disponibles (route publique)' })
  @ApiOkResponse({ type: Boisson, isArray: true })
  lister(): readonly Boisson[] {
    return CATALOGUE;
  }
}
