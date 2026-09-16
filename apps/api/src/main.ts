import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { ConfigurationMyBrew } from './configuration/configuration.js';

async function demarrer(): Promise<void> {
  const journal = new Logger('MyBrew');
  const application = await NestFactory.create(AppModule);
  const configuration = application.get(ConfigService<ConfigurationMyBrew, true>);

  const port = configuration.get('port', { infer: true });
  const originesAutorisees = configuration.get('originesAutorisees', { infer: true });
  const securite = configuration.get('securite', { infer: true });

  /*
   * CORS : dans l'architecture finale, seule la gateway Gravitee appelle
   * l'API, donc CORS n'y sert plus a rien. On le laisse en place pour les
   * premieres etapes du TP, ou la SPA attaque l'API directement.
   */
  application.enableCors({
    origin: originesAutorisees,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Gravitee-Api-Key'],
    maxAge: 600,
  });

  application.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // La specification OpenAPI est publiee : Gravitee sait importer une API a
  // partir de cette URL (`/documentation-json`).
  const documentation = new DocumentBuilder()
    .setTitle('API MyBrew')
    .setDescription(
      "API de gestion de la machine a cafe MyBrew. Support du TP « Securiser et Manager son API ».",
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jeton-keycloak')
    .addServer('http://localhost:8082/mybrew', 'Via la gateway Gravitee')
    .addServer('http://localhost:3000', "En direct sur l'API (etapes 1 a 5)")
    .build();

  SwaggerModule.setup('documentation', application, () =>
    SwaggerModule.createDocument(application, documentation),
  );

  await application.listen(port, '0.0.0.0');

  journal.log(`API MyBrew a l'ecoute sur le port ${port}`);
  journal.log(`Documentation OpenAPI : http://localhost:${port}/documentation`);
  journal.warn(
    securite.activee
      ? 'Securite activee : un jeton valide est exige sur les routes protegees.'
      : 'SECURITE DESACTIVEE : toutes les routes sont ouvertes (etape 1 du TP).',
  );
}

await demarrer();
