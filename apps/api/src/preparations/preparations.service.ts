import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { trouverBoisson } from '../boissons/boisson.js';
import { MachineService } from '../machine/machine.service.js';
import type { Utilisateur } from '../securite/utilisateur.js';
import type { DemanderPreparationDto } from './dto/demander-preparation.dto.js';
import type { Preparation, Statistiques, StatistiquesParUtilisateur } from './preparation.js';

/** Nombre de preparations conservees en memoire (l'API n'a pas de base). */
const HISTORIQUE_MAXIMUM = 200;

/**
 * Utilisateur de secours employe lorsque la securite est desactivee
 * (etape 1 du TP) : sans jeton, impossible de savoir qui commande.
 */
const UTILISATEUR_ANONYME: Utilisateur = {
  identifiant: 'anonyme',
  nomUtilisateur: 'anonyme',
  nomAffiche: 'Utilisateur anonyme',
  roles: [],
  scopes: [],
  clientOAuth: 'aucun',
  estUnService: false,
};

@Injectable()
export class PreparationsService {
  private readonly journal = new Logger(PreparationsService.name);
  private readonly historique: Preparation[] = [];

  constructor(private readonly machine: MachineService) {}

  preparer(demande: DemanderPreparationDto, utilisateur?: Utilisateur): Preparation {
    const boisson = trouverBoisson(demande.identifiantBoisson);

    if (!boisson) {
      throw new NotFoundException(`Boisson inconnue : ${demande.identifiantBoisson}.`);
    }

    // La machine verifie ses reservoirs et consomme les ingredients.
    this.machine.servir(boisson);

    const auteur = utilisateur ?? UTILISATEUR_ANONYME;
    const preparation: Preparation = {
      identifiant: randomUUID(),
      identifiantBoisson: boisson.identifiant,
      libelleBoisson: boisson.libelle,
      auteur: {
        identifiant: auteur.identifiant,
        nomUtilisateur: auteur.nomUtilisateur,
        nomAffiche: auteur.nomAffiche,
      },
      horodatage: new Date().toISOString(),
      sucres: demande.sucres ?? 0,
      clientOAuth: auteur.clientOAuth,
    };

    this.historique.unshift(preparation);
    this.historique.length = Math.min(this.historique.length, HISTORIQUE_MAXIMUM);

    this.journal.log(`${boisson.libelle} servi a ${auteur.nomAffiche} (${auteur.clientOAuth})`);

    return preparation;
  }

  /** Historique personnel, ou historique complet pour un administrateur. */
  lister(utilisateur: Utilisateur | undefined, toutesLesPreparations: boolean): Preparation[] {
    if (toutesLesPreparations || !utilisateur) {
      return [...this.historique];
    }

    return this.historique.filter(
      (preparation) => preparation.auteur.identifiant === utilisateur.identifiant,
    );
  }

  purger(): { nombreSupprime: number } {
    const nombreSupprime = this.historique.length;
    this.historique.length = 0;
    this.journal.warn(`Historique purge : ${nombreSupprime} preparation(s) supprimee(s).`);

    return { nombreSupprime };
  }

  statistiques(): Statistiques {
    const parUtilisateur = new Map<string, StatistiquesParUtilisateur>();
    const parBoisson: Record<string, number> = {};

    for (const preparation of this.historique) {
      const cle = preparation.auteur.nomUtilisateur;
      const existant = parUtilisateur.get(cle);

      if (existant) {
        existant.nombreDePreparations += 1;
      } else {
        parUtilisateur.set(cle, {
          nomUtilisateur: cle,
          nomAffiche: preparation.auteur.nomAffiche,
          nombreDePreparations: 1,
          // L'historique est trie du plus recent au plus ancien.
          dernierePreparation: preparation.horodatage,
        });
      }

      parBoisson[preparation.identifiantBoisson] =
        (parBoisson[preparation.identifiantBoisson] ?? 0) + 1;
    }

    return {
      nombreTotal: this.historique.length,
      parUtilisateur: [...parUtilisateur.values()].sort(
        (premier, second) => second.nombreDePreparations - premier.nombreDePreparations,
      ),
      parBoisson,
    };
  }
}
