import { DatePipe, JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MessageErreur } from '../composants/message-erreur';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';
import { decrireErreur, type ErreurAffichable } from '../noyau/erreurs';
import type { Profil } from '../noyau/modeles';
import { MyBrewApiService } from '../noyau/mybrew-api.service';
import { SessionService } from '../noyau/session.service';

/**
 * Page de debug du TP : que contient mon jeton, et qu'en comprend l'API ?
 * C'est l'ecran a garder ouvert pendant tous les exercices.
 */
@Component({
  selector: 'app-mon-jeton',
  imports: [DatePipe, JsonPipe, MessageErreur],
  template: `
    <section class="entete-page">
      <h2>Mon jeton</h2>
      <p class="sous-titre">
        Ce que la SPA a recu de Keycloak, et ce que l'API en comprend de son cote.
      </p>
    </section>

    <article class="carte">
      <h3>Configuration d'execution</h3>
      <dl class="definitions">
        <dt>URL de l'API appelee</dt>
        <dd><code>{{ configuration.urlApi }}</code></dd>
        <dt>Autorite OIDC</dt>
        <dd><code>{{ configuration.keycloak.autorite }}</code></dd>
        <dt>Client OAuth</dt>
        <dd><code>{{ configuration.keycloak.clientId }}</code></dd>
        <dt>Scopes demandes</dt>
        <dd><code>{{ configuration.keycloak.scopes }}</code></dd>
      </dl>
    </article>

    @if (session.jeton(); as jeton) {
      <article class="carte">
        <h3>Jeton d'acces</h3>
        <dl class="definitions">
          <dt>Sujet (sub)</dt>
          <dd><code>{{ jeton.sub }}</code></dd>
          <dt>Emetteur (iss)</dt>
          <dd><code>{{ jeton.iss }}</code></dd>
          <dt>Audience (aud)</dt>
          <dd><code>{{ jeton.aud }}</code></dd>
          <dt>Client (azp)</dt>
          <dd><code>{{ jeton.azp }}</code></dd>
          <dt>Expire a</dt>
          <dd>{{ session.expiration() | date: 'HH:mm:ss' }}</dd>
          <dt>Roles</dt>
          <dd>
            @for (role of session.roles(); track role) {
              <span class="etiquette">{{ role }}</span>
            }
          </dd>
          <dt>Scopes</dt>
          <dd>
            @for (scope of session.scopes(); track scope) {
              <span class="etiquette">{{ scope }}</span>
            }
          </dd>
        </dl>
        <div class="barre-actions">
          <button type="button" class="bouton" (click)="copierJeton()">
            {{ copie() ? 'Copie !' : 'Copier le jeton brut' }}
          </button>
        </div>
        <p class="note">
          Collez-le dans <code>jwt.io</code> ou dans un <code>curl -H "Authorization: Bearer ..."</code>
          pour appeler l'API sans passer par la SPA.
        </p>
      </article>
    } @else {
      <p class="note">Aucun jeton : connectez-vous pour en obtenir un.</p>
    }

    <app-message-erreur [erreur]="erreur()" />

    <article class="carte">
      <h3>Vu par l'API (GET /moi)</h3>
      <div class="barre-actions">
        <button type="button" class="bouton" (click)="interroger()">Interroger l'API</button>
      </div>
      @if (profil(); as donnees) {
        <p>
          Passe par la gateway :
          <strong>{{ donnees.passeParLaGateway ? 'oui' : 'non' }}</strong>
        </p>
        <pre class="bloc-json">{{ donnees | json }}</pre>
      }
    </article>
  `,
})
export class MonJeton {
  private readonly api = inject(MyBrewApiService);
  protected readonly session = inject(SessionService);
  protected readonly configuration = inject(CONFIGURATION_APPLICATION);

  protected readonly profil = signal<Profil | null>(null);
  protected readonly erreur = signal<ErreurAffichable | null>(null);
  protected readonly copie = signal(false);

  constructor() {
    this.interroger();
  }

  protected interroger(): void {
    this.erreur.set(null);

    this.api.profil().subscribe({
      next: (donnees) => this.profil.set(donnees),
      error: (erreur: unknown) => {
        this.profil.set(null);
        this.erreur.set(decrireErreur(erreur));
      },
    });
  }

  protected copierJeton(): void {
    const jeton = this.session.jetonBrutCourant();

    if (!jeton) {
      return;
    }

    void navigator.clipboard.writeText(jeton).then(() => {
      this.copie.set(true);
      setTimeout(() => this.copie.set(false), 2000);
    });
  }
}
