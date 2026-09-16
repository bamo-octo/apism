import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MessageErreur } from '../composants/message-erreur';
import { decrireErreur, type ErreurAffichable } from '../noyau/erreurs';
import type { Statistiques as StatistiquesModele } from '../noyau/modeles';
import { MyBrewApiService } from '../noyau/mybrew-api.service';

/** Classement des plus gros consommateurs (role administrateur). */
@Component({
  selector: 'app-statistiques',
  imports: [DatePipe, MessageErreur],
  template: `
    <section class="entete-page">
      <h2>Statistiques</h2>
      <p class="sous-titre">
        Donnee sensible : qui vide la machine ? Reserve au role
        <code>administrateur</code> et au scope <code>statistiques:lire</code>.
      </p>
    </section>

    <app-message-erreur [erreur]="erreur()" />

    @if (statistiques(); as donnees) {
      <p class="compteur">{{ donnees.nombreTotal }} boisson(s) servie(s) depuis le demarrage.</p>

      <table class="tableau">
        <thead>
          <tr>
            <th>Buveur</th>
            <th>Boissons</th>
            <th>Derniere</th>
          </tr>
        </thead>
        <tbody>
          @for (ligne of donnees.parUtilisateur; track ligne.nomUtilisateur) {
            <tr>
              <td>{{ ligne.nomAffiche }} (<code>{{ ligne.nomUtilisateur }}</code>)</td>
              <td>{{ ligne.nombreDePreparations }}</td>
              <td>{{ ligne.dernierePreparation | date: 'dd/MM HH:mm:ss' }}</td>
            </tr>
          }
        </tbody>
      </table>

      <h3>Par boisson</h3>
      <ul class="liste-simple">
        @for (ligne of parBoisson(donnees); track ligne[0]) {
          <li>{{ ligne[0] }} : {{ ligne[1] }}</li>
        }
      </ul>
    }
  `,
})
export class Statistiques {
  private readonly api = inject(MyBrewApiService);

  protected readonly statistiques = signal<StatistiquesModele | null>(null);
  protected readonly erreur = signal<ErreurAffichable | null>(null);

  constructor() {
    this.api.statistiques().subscribe({
      next: (donnees) => this.statistiques.set(donnees),
      error: (erreur: unknown) => this.erreur.set(decrireErreur(erreur)),
    });
  }

  protected parBoisson(donnees: StatistiquesModele): [string, number][] {
    return Object.entries(donnees.parBoisson).sort(
      (premier, second) => second[1] - premier[1],
    );
  }
}
