import { Module } from '@nestjs/common';
import { BoissonsModule } from '../boissons/boissons.module.js';
import { PreparationsController } from './preparations.controller.js';
import { PreparationsService } from './preparations.service.js';

@Module({
  imports: [BoissonsModule],
  controllers: [PreparationsController],
  providers: [PreparationsService],
})
export class PreparationsModule {}
