import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MessageErreur } from '../composants/message-erreur';
import { decrireErreur, type ErreurAffichable } from '../noyau/erreurs';
import type { Preparation } from '../noyau/modeles';
import { MyBrewApiService } from '../noyau/mybrew-api.service';

@Component({
  selector: 'app-historique',
  imports: [DatePipe, MessageErreur],
  template: `
    <section class="entete-page">
      <h2>Historique</h2>
      <p class="sous-titre">Les préparations, les plus récentes d'abord.</p>
    </section>

    <div class="barre-actions">
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
          </tr>
        </thead>
        <tbody>
          @for (preparation of preparations(); track preparation.id) {
            <tr>
              <td>{{ preparation.horodatage | date: 'dd/MM HH:mm:ss' }}</td>
              <td>{{ preparation.libelleBoisson }}</td>
              <td>{{ preparation.sucres }}</td>
              <td>{{ preparation.auteur.nom }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class Historique {
  private readonly api = inject(MyBrewApiService);

  protected readonly preparations = signal<Preparation[]>([]);
  protected readonly erreur = signal<ErreurAffichable | null>(null);

  constructor() {
    this.rafraichir();
  }

  protected rafraichir(): void {
    this.erreur.set(null);

    this.api.preparations().subscribe({
      next: (preparations) => this.preparations.set(preparations),
      error: (erreur: unknown) => this.erreur.set(decrireErreur(erreur)),
    });
  }
}
