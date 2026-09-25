import { Module } from '@nestjs/common';
import { PreparationsController } from './preparations.controller.js';
import { PreparationsService } from './preparations.service.js';

@Module({
  controllers: [PreparationsController],
  providers: [PreparationsService],
})
export class PreparationsModule {}
