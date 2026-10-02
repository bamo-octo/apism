import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JetonCourant } from '../jetons/jeton-courant.js';
import { JetonGuard } from '../jetons/jeton.guard.js';
import type { Boisson } from './boisson.js';
import { CatalogueService } from './catalogue.service.js';
import { BoissonDto } from './dto/boisson.dto.js';

@Controller('boissons')
export class BoissonsController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get()
  @UseGuards(JetonGuard)
  lister(@JetonCourant() jeton: string | undefined): Promise<Boisson[]> {
    return this.catalogue.lister(jeton);
  }

  @Post()
  @UseGuards(JetonGuard)
  ajouter(@Body() boisson: BoissonDto, @JetonCourant() jeton: string | undefined): Promise<Boisson> {
    return this.catalogue.ajouter(boisson, jeton);
  }

  @Delete(':id')
  @UseGuards(JetonGuard)
  @HttpCode(204)
  supprimer(@Param('id') id: string, @JetonCourant() jeton: string | undefined): Promise<void> {
    return this.catalogue.supprimer(id, jeton);
  }
}
