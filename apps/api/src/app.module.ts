import { Module } from '@nestjs/common';
import { BoissonsModule } from './boissons/boissons.module.js';
import { PreparationsModule } from './preparations/preparations.module.js';

@Module({
  imports: [BoissonsModule, PreparationsModule],
})
export class AppModule {}
