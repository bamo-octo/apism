import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MessageErreur } from '../composants/message-erreur';
import { decrireErreur, type ErreurAffichable } from '../noyau/erreurs';
import type { EtatMachine, NiveauReservoir, OperationEntretien } from '../noyau/modeles';
import { MyBrewApiService } from '../noyau/mybrew-api.service';
import { SessionService } from '../noyau/session.service';

/** Etat de la machine et operations d'entretien (role technicien). */
@Component({
  selector: 'app-machine',
  imports: [DatePipe, MessageErreur],
  template: `
    <section class="entete-page">
      <h2>La machine</h2>
      <p class="sous-titre">
        Les niveaux sont mis a jour par la sonde embarquee, authentifiee en
        <code>client_credentials</code>.
      </p>
    </section>

    <app-message-erreur [erreur]="erreur()" />

    @if (etat(); as machine) {
      <article class="carte">
        <header class="carte__entete-machine">
          <div>
            <h3>{{ machine.numeroDeSerie }}</h3>
            <p class="carte__description">{{ machine.emplacement }}</p>
          </div>
          <span class="etiquette" [class.etiquette--alerte]="!machine.enService">
            {{ machine.enService ? 'En service' : 'Hors service' }}
          </span>
        </header>

        @for (reservoir of reservoirs(machine); track reservoir[0]) {
          <div class="jauge">
            <div class="jauge__entete">
              <span>{{ reservoir[0] }}</span>
              <span>
                {{ reservoir[1].actuel }} / {{ reservoir[1].capacite }} {{ reservoir[1].unite }}
              </span>
            </div>
            <div class="jauge__piste">
              <div
                class="jauge__valeur"
                [class.jauge__valeur--basse]="reservoir[1].pourcentage < 15"
                [style.width.%]="reservoir[1].pourcentage"
              ></div>
            </div>
          </div>
        }

        <p class="carte__details">
          Temperature : {{ machine.temperatureC }} &deg;C &middot; Dernier entretien :
          {{
            machine.derniereMaintenance
              ? (machine.derniereMaintenance | date: 'dd/MM HH:mm')
              : 'jamais'
          }}
          &middot; Dernier releve de la sonde :
          {{
            machine.derniereTelemetrie
              ? (machine.derniereTelemetrie | date: 'dd/MM HH:mm:ss')
              : 'aucun'
          }}
        </p>

        @if (machine.alertes.length > 0) {
          <ul class="liste-alertes">
            @for (alerte of machine.alertes; track alerte) {
              <li>{{ alerte }}</li>
            }
          </ul>
        }
      </article>
    }

    <section class="entete-page">
      <h3>Entretien</h3>
      <p class="sous-titre">
        Reserve au role <code>technicien</code> et au scope <code>machine:entretenir</code>.
      </p>
    </section>

    <div class="barre-actions">
      <button type="button" class="bouton" (click)="entretenir({ remplirEau: true })">
        Remplir l'eau
      </button>
      <button type="button" class="bouton" (click)="entretenir({ remplirGrains: true })">
        Remplir les grains
      </button>
      <button type="button" class="bouton" (click)="entretenir({ remplirLait: true })">
        Remplir le lait
      </button>
      <button type="button" class="bouton" (click)="entretenir({ viderBacAMarc: true })">
        Vider le bac a marc
      </button>
      <button
        type="button"
        class="bouton bouton--principal"
        (click)="
          entretenir({
            remplirEau: true,
            remplirGrains: true,
            remplirLait: true,
            viderBacAMarc: true,
            detartrer: true,
          })
        "
      >
        Remise a neuf complete
      </button>
    </div>

    @if (!session.aLeRole('technicien')) {
      <p class="note">
        Vous n'etes pas technicien : ces boutons declencheront un 403. Connectez-vous avec
        <code>chloe</code> pour les utiliser.
      </p>
    }
  `,
})
export class Machine {
  private readonly api = inject(MyBrewApiService);
  protected readonly session = inject(SessionService);

  protected readonly etat = signal<EtatMachine | null>(null);
  protected readonly erreur = signal<ErreurAffichable | null>(null);

  constructor() {
    this.rafraichir();
  }

  protected reservoirs(machine: EtatMachine): [string, NiveauReservoir][] {
    return [
      ['Eau', machine.eau],
      ['Grains', machine.grains],
      ['Lait', machine.lait],
      ['Bac a marc', machine.bacAMarc],
    ];
  }

  protected rafraichir(): void {
    this.erreur.set(null);

    this.api.etatMachine().subscribe({
      next: (etat) => this.etat.set(etat),
      error: (erreur: unknown) => this.erreur.set(decrireErreur(erreur)),
    });
  }

  protected entretenir(operations: OperationEntretien): void {
    this.erreur.set(null);

    this.api.entretenir(operations).subscribe({
      next: (etat) => this.etat.set(etat),
      error: (erreur: unknown) => this.erreur.set(decrireErreur(erreur)),
    });
  }
}
