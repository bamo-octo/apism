import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MessageErreur } from '../composants/message-erreur';
import { decrireErreur, type ErreurAffichable } from '../noyau/erreurs';
import type { Preparation } from '../noyau/modeles';
import { MyBrewApiService } from '../noyau/mybrew-api.service';
import { SessionService } from '../noyau/session.service';

/** Historique personnel, ou historique complet pour un administrateur. */
@Component({
  selector: 'app-mes-preparations',
  imports: [DatePipe, MessageErreur],
  template: `
    <section class="entete-page">
      <h2>Historique</h2>
      <p class="sous-titre">
        L'API filtre l'historique selon le <code>sub</code> du jeton : vous ne voyez que vos
        boissons, sauf si vous etes administrateur.
      </p>
    </section>

    <div class="barre-actions">
      @if (session.aLeRole('administrateur')) {
        <label class="interrupteur">
          <input type="checkbox" [checked]="toutes()" (change)="basculerToutes($event)" />
          Voir l'historique de tout le monde
        </label>
        <button type="button" class="bouton bouton--danger" (click)="purger()">
          Purger l'historique
        </button>
      }
      <button type="button" class="bouton" (click)="rafraichir()">Rafraichir</button>
    </div>

    <app-message-erreur [erreur]="erreur()" />

    @if (preparations().length === 0) {
      <p class="note">Aucune preparation pour l'instant. La journee peut encore commencer.</p>
    } @else {
      <table class="tableau">
        <thead>
          <tr>
            <th>Heure</th>
            <th>Boisson</th>
            <th>Sucres</th>
            <th>Buveur</th>
            <th>Client OAuth</th>
          </tr>
        </thead>
        <tbody>
          @for (preparation of preparations(); track preparation.identifiant) {
            <tr>
              <td>{{ preparation.horodatage | date: 'dd/MM HH:mm:ss' }}</td>
              <td>{{ preparation.libelleBoisson }}</td>
              <td>{{ preparation.sucres }}</td>
              <td>{{ preparation.auteur.nomAffiche }}</td>
              <td><code>{{ preparation.clientOAuth }}</code></td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class MesPreparations {
  private readonly api = inject(MyBrewApiService);
  protected readonly session = inject(SessionService);

  protected readonly preparations = signal<Preparation[]>([]);
  protected readonly erreur = signal<ErreurAffichable | null>(null);
  protected readonly toutes = signal(false);

  constructor() {
    this.rafraichir();
  }

  protected rafraichir(): void {
    this.erreur.set(null);

    this.api.preparations(this.toutes()).subscribe({
      next: (preparations) => this.preparations.set(preparations),
      error: (erreur: unknown) => this.erreur.set(decrireErreur(erreur)),
    });
  }

  protected basculerToutes(evenement: Event): void {
    this.toutes.set((evenement.target as HTMLInputElement).checked);
    this.rafraichir();
  }

  protected purger(): void {
    this.erreur.set(null);

    this.api.purgerPreparations().subscribe({
      next: () => this.rafraichir(),
      error: (erreur: unknown) => this.erreur.set(decrireErreur(erreur)),
    });
  }
}
