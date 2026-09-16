import { Module } from '@nestjs/common';
import { MachineModule } from '../machine/machine.module.js';
import { PreparationsController } from './preparations.controller.js';
import { PreparationsService } from './preparations.service.js';

@Module({
  imports: [MachineModule],
  controllers: [PreparationsController],
  providers: [PreparationsService],
  exports: [PreparationsService],
})
export class PreparationsModule {}
