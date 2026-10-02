import { Module } from '@nestjs/common';
import { BoissonsController } from './boissons.controller.js';
import { CatalogueService } from './catalogue.service.js';

@Module({
  controllers: [BoissonsController],
  providers: [CatalogueService],
  exports: [CatalogueService],
})
export class BoissonsModule {}
