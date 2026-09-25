import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MessageErreur } from '../composants/message-erreur';
import { decrireErreur, type ErreurAffichable } from '../noyau/erreurs';
import type { Boisson, Preparation } from '../noyau/modeles';
import { MyBrewApiService } from '../noyau/mybrew-api.service';

/** Écran principal : le catalogue et le bouton qui coule le café. */
@Component({
  selector: 'app-accueil',
  imports: [DatePipe, MessageErreur],
  template: `
    <section class="entete-page">
      <h2>Que boit-on ?</h2>
      <p class="sous-titre">Choisissez votre boisson, la machine se charge du reste.</p>
    </section>

    <app-message-erreur [erreur]="erreur()" />

    @if (derniereBoisson(); as preparation) {
      <div class="alerte alerte--succes" role="status">
        <p class="alerte__titre">{{ preparation.libelleBoisson }} en cours de coulage</p>
        <p class="alerte__detail">Servi a {{ preparation.horodatage | date: 'HH:mm:ss' }}.</p>
      </div>
    }

    @if (chargement()) {
      <p class="attente">Chargement du catalogue...</p>
    }

    <div class="grille-cartes">
      @for (boisson of boissons(); track boisson.id) {
        <article class="carte carte--boisson">
          <header>
            <h3>{{ boisson.libelle }}</h3>
            <span class="etiquette" [title]="'Intensite ' + boisson.intensite + '/5'">
              {{ intensite(boisson) }}
            </span>
          </header>
          <p class="carte__description">{{ boisson.description }}</p>
          <p class="carte__details">
            {{ boisson.doseEauMl }} ml d'eau &middot; {{ boisson.doseGrainsG }} g de grains
            @if (boisson.doseLaitMl > 0) {
              &middot; {{ boisson.doseLaitMl }} ml de lait
            }
          </p>
          <div class="carte__actions">
            <label>
              Sucres
              <select [value]="sucres()" (change)="changerSucres($event)">
                @for (valeur of [0, 1, 2, 3]; track valeur) {
                  <option [value]="valeur">{{ valeur }}</option>
                }
              </select>
            </label>
            <button
              type="button"
              class="bouton bouton--principal"
              [disabled]="enCours() === boisson.id"
              (click)="couler(boisson)"
            >
              {{ enCours() === boisson.id ? 'Coulage...' : 'Couler' }}
            </button>
          </div>
        </article>
      }
    </div>
  `,
})
export class Accueil {
  private readonly api = inject(MyBrewApiService);

  protected readonly boissons = signal<Boisson[]>([]);
  protected readonly erreur = signal<ErreurAffichable | null>(null);
  protected readonly derniereBoisson = signal<Preparation | null>(null);
  protected readonly chargement = signal(true);
  protected readonly enCours = signal<string | null>(null);
  protected readonly sucres = signal(0);

  constructor() {
    this.api.boissons().subscribe({
      next: (boissons) => {
        this.boissons.set(boissons);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(decrireErreur(erreur));
        this.chargement.set(false);
      },
    });
  }

  protected changerSucres(evenement: Event): void {
    this.sucres.set(Number((evenement.target as HTMLSelectElement).value));
  }

  protected couler(boisson: Boisson): void {
    this.erreur.set(null);
    this.enCours.set(boisson.id);

    this.api.preparer(boisson.id, this.sucres()).subscribe({
      next: (preparation) => {
        this.derniereBoisson.set(preparation);
        this.enCours.set(null);
      },
      error: (erreur: unknown) => {
        this.derniereBoisson.set(null);
        this.erreur.set(decrireErreur(erreur));
        this.enCours.set(null);
      },
    });
  }

  protected intensite(boisson: Boisson): string {
    return '●'.repeat(boisson.intensite) + '○'.repeat(5 - boisson.intensite);
  }
}
