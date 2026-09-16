import { Module } from '@nestjs/common';
import { ProfilController } from './profil.controller.js';
import { SanteController } from './sante.controller.js';

@Module({
  controllers: [SanteController, ProfilController],
})
export class SanteModule {}
