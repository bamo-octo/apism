import { Module } from '@nestjs/common';
import { BoissonsController } from './boissons.controller.js';

@Module({
  controllers: [BoissonsController],
})
export class BoissonsModule {}
