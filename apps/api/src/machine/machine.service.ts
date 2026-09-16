import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { Boisson } from '../boissons/boisson.js';
import { EtatMachine, NiveauReservoir } from './etat-machine.js';
import type { OperationEntretienDto } from './dto/operation-entretien.dto.js';
import type { ReleveTelemetrieDto } from './dto/releve-telemetrie.dto.js';

interface Reservoir {
  actuel: number;
  capacite: number;
  unite: 'ml' | 'g';
}

const CAPACITES = {
  eau: 2_000,
  grains: 500,
  lait: 1_000,
  bacAMarc: 200,
} as const;

/** Seuil (en pourcentage) sous lequel une alerte est levee. */
const SEUIL_ALERTE_POURCENTAGE = 15;

/**
 * Etat de la machine, garde en memoire.
 * Le TP n'utilise volontairement aucune base de donnees : redemarrer l'API
 * remet la machine a neuf, ce qui est pratique entre deux exercices.
 */
@Injectable()
export class MachineService {
  private readonly journal = new Logger(MachineService.name);

  private enService = true;
  private temperatureC = 92.5;
  private derniereMaintenance: string | null = null;
  private derniereTelemetrie: string | null = null;

  private readonly eau: Reservoir = { actuel: CAPACITES.eau, capacite: CAPACITES.eau, unite: 'ml' };
  private readonly grains: Reservoir = {
    actuel: CAPACITES.grains,
    capacite: CAPACITES.grains,
    unite: 'g',
  };
  private readonly lait: Reservoir = { actuel: CAPACITES.lait, capacite: CAPACITES.lait, unite: 'ml' };
  private readonly bacAMarc: Reservoir = { actuel: 0, capacite: CAPACITES.bacAMarc, unite: 'g' };

  etat(): EtatMachine {
    return {
      numeroDeSerie: 'MYBREW-001',
      emplacement: 'Cuisine du 2eme etage',
      enService: this.enService,
      eau: this.decrire(this.eau),
      grains: this.decrire(this.grains),
      lait: this.decrire(this.lait),
      bacAMarc: this.decrire(this.bacAMarc),
      temperatureC: Math.round(this.temperatureC * 10) / 10,
      derniereMaintenance: this.derniereMaintenance,
      derniereTelemetrie: this.derniereTelemetrie,
      alertes: this.alertes(),
    };
  }

  /**
   * Verifie que la machine peut servir la boisson demandee, puis consomme les
   * ingredients. Leve une 503 explicite sinon : c'est ce message que les
   * participants verront dans la SPA.
   */
  servir(boisson: Boisson): void {
    if (!this.enService) {
      throw new ServiceUnavailableException('La machine est hors service, un technicien a ete prevenu.');
    }

    if (this.eau.actuel < boisson.doseEauMl) {
      throw new ServiceUnavailableException("Reservoir d'eau vide : preveniez un technicien.");
    }

    if (this.grains.actuel < boisson.doseGrainsG) {
      throw new ServiceUnavailableException('Plus de grains de cafe : preveniez un technicien.');
    }

    if (this.lait.actuel < boisson.doseLaitMl) {
      throw new ServiceUnavailableException('Plus de lait : choisissez une boisson sans lait.');
    }

    if (this.bacAMarc.actuel + boisson.doseGrainsG > this.bacAMarc.capacite) {
      throw new ServiceUnavailableException('Bac a marc plein : il doit etre vide par un technicien.');
    }

    this.eau.actuel -= boisson.doseEauMl;
    this.grains.actuel -= boisson.doseGrainsG;
    this.lait.actuel -= boisson.doseLaitMl;
    this.bacAMarc.actuel += boisson.doseGrainsG;
    this.temperatureC = Math.max(84, this.temperatureC - 0.4);
  }

  entretenir(operations: OperationEntretienDto): EtatMachine {
    if (operations.remplirEau) {
      this.eau.actuel = this.eau.capacite;
    }

    if (operations.remplirGrains) {
      this.grains.actuel = this.grains.capacite;
    }

    if (operations.remplirLait) {
      this.lait.actuel = this.lait.capacite;
    }

    if (operations.viderBacAMarc) {
      this.bacAMarc.actuel = 0;
    }

    if (operations.detartrer) {
      this.temperatureC = 92.5;
      this.enService = true;
    }

    this.derniereMaintenance = new Date().toISOString();
    this.journal.log(`Entretien realise : ${JSON.stringify(operations)}`);

    return this.etat();
  }

  /** Appele par la sonde de la machine, authentifiee en `client_credentials`. */
  enregistrerTelemetrie(releve: ReleveTelemetrieDto): EtatMachine {
    this.eau.actuel = Math.min(releve.eauMl, this.eau.capacite);
    this.grains.actuel = Math.min(releve.grainsG, this.grains.capacite);
    this.lait.actuel = Math.min(releve.laitMl, this.lait.capacite);

    if (releve.marcG !== undefined) {
      this.bacAMarc.actuel = Math.min(releve.marcG, this.bacAMarc.capacite);
    }

    this.temperatureC = releve.temperatureC;
    this.enService = releve.enService ?? this.enService;
    this.derniereTelemetrie = new Date().toISOString();

    return this.etat();
  }

  private alertes(): string[] {
    const alertes: string[] = [];

    if (!this.enService) {
      alertes.push('Machine hors service');
    }

    if (this.pourcentage(this.eau) < SEUIL_ALERTE_POURCENTAGE) {
      alertes.push("Niveau d'eau bas");
    }

    if (this.pourcentage(this.grains) < SEUIL_ALERTE_POURCENTAGE) {
      alertes.push('Niveau de grains bas');
    }

    if (this.pourcentage(this.lait) < SEUIL_ALERTE_POURCENTAGE) {
      alertes.push('Niveau de lait bas');
    }

    if (this.pourcentage(this.bacAMarc) > 100 - SEUIL_ALERTE_POURCENTAGE) {
      alertes.push('Bac a marc presque plein');
    }

    return alertes;
  }

  private decrire(reservoir: Reservoir): NiveauReservoir {
    return {
      actuel: Math.round(reservoir.actuel),
      capacite: reservoir.capacite,
      unite: reservoir.unite,
      pourcentage: Math.round(this.pourcentage(reservoir)),
    };
  }

  private pourcentage(reservoir: Reservoir): number {
    return (reservoir.actuel / reservoir.capacite) * 100;
  }
}
