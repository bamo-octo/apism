import { Controller, Get } from '@nestjs/common';
import { Boisson, CATALOGUE } from './boisson.js';

@Controller('boissons')
export class BoissonsController {
  @Get()
  lister(): readonly Boisson[] {
    return CATALOGUE;
  }
}
