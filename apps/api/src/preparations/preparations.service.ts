import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { trouverBoisson } from '../boissons/boisson.js';
import type { Utilisateur } from '../utilisateurs/utilisateur.js';
import type { DemanderPreparationDto } from './dto/demander-preparation.dto.js';
import type { Preparation } from './preparation.js';

/** Nombre de préparations conservées en mémoire (l'API n'a pas de base). */
const HISTORIQUE_MAXIMUM = 200;

@Injectable()
export class PreparationsService {
  private readonly historique: Preparation[] = [];

  preparer(demande: DemanderPreparationDto, auteur: Utilisateur): Preparation {
    const boisson = trouverBoisson(demande.idBoisson);

    if (!boisson) {
      throw new NotFoundException(`Boisson inconnue : ${demande.idBoisson}.`);
    }

    const preparation: Preparation = {
      id: randomUUID(),
      idBoisson: boisson.id,
      libelleBoisson: boisson.libelle,
      auteur,
      horodatage: new Date().toISOString(),
      sucres: demande.sucres ?? 0,
    };

    this.historique.unshift(preparation);
    this.historique.length = Math.min(this.historique.length, HISTORIQUE_MAXIMUM);

    return preparation;
  }

  lister(utilisateur: Utilisateur): Preparation[] {
    return this.historique.filter((preparation) => preparation.auteur.id === utilisateur.id);
  }
}
