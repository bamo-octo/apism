import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { chargerConfiguration } from './configuration/configuration.js';
import { BoissonsModule } from './boissons/boissons.module.js';
import { MachineModule } from './machine/machine.module.js';
import { PreparationsModule } from './preparations/preparations.module.js';
import { SanteModule } from './sante/sante.module.js';
import { SecuriteModule } from './securite/securite.module.js';
import { StatistiquesModule } from './statistiques/statistiques.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [chargerConfiguration], cache: true }),
    SecuriteModule,
    SanteModule,
    BoissonsModule,
    MachineModule,
    PreparationsModule,
    StatistiquesModule,
  ],
})
export class AppModule {}
