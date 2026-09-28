import { Module } from '@nestjs/common';
import { BoissonsModule } from './boissons/boissons.module.js';
import { JetonsModule } from './jetons/jetons.module.js';
import { PreparationsModule } from './preparations/preparations.module.js';

@Module({
  imports: [BoissonsModule, JetonsModule, PreparationsModule],
})
export class AppModule {}
