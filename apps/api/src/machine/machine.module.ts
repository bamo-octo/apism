import { Module } from '@nestjs/common';
import { MachineController } from './machine.controller.js';
import { MachineService } from './machine.service.js';

@Module({
  controllers: [MachineController],
  providers: [MachineService],
  exports: [MachineService],
})
export class MachineModule {}
