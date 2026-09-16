import { Module } from '@nestjs/common';
import { PreparationsModule } from '../preparations/preparations.module.js';
import { StatistiquesController } from './statistiques.controller.js';

@Module({
  imports: [PreparationsModule],
  controllers: [StatistiquesController],
})
export class StatistiquesModule {}
