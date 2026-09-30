import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JetonGuard } from '../jetons/jeton.guard.js';
import { UtilisateurCourant } from '../utilisateurs/utilisateur-courant.js';
import type { Utilisateur } from '../utilisateurs/utilisateur.js';
import { type Boisson, CATALOGUE, peutCommander, trouverBoisson } from './boisson.js';
import { BoissonDto } from './dto/boisson.dto.js';

@Controller('boissons')
export class BoissonsController {
  @Get()
  @UseGuards(JetonGuard)
  lister(@UtilisateurCourant() utilisateur: Utilisateur | undefined): readonly Boisson[] {
    return CATALOGUE.filter((boisson) => peutCommander(utilisateur, boisson));
  }

  @Post()
  @UseGuards(JetonGuard)
  ajouter(@Body() boisson: BoissonDto): Boisson {
    if (trouverBoisson(boisson.id)) {
      throw new ConflictException(`La boisson ${boisson.id} existe déjà.`);
    }

    CATALOGUE.push(boisson);
    return boisson;
  }

  @Delete(':id')
  @UseGuards(JetonGuard)
  @HttpCode(204)
  supprimer(@Param('id') id: string): void {
    const boisson = trouverBoisson(id);

    if (!boisson) {
      throw new NotFoundException(`Boisson inconnue : ${id}.`);
    }

    CATALOGUE.splice(CATALOGUE.indexOf(boisson), 1);
  }
}
