import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function demarrer(): Promise<void> {
  const journal = new Logger('MyBrew');
  const application = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);

  application.enableCors();

  application.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  await application.listen(port, '0.0.0.0');

  journal.log(`API MyBrew a l'écoute sur le port ${port}`);
}

await demarrer();
