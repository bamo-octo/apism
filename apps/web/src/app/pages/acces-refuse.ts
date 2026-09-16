import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../noyau/session.service';

@Component({
  selector: 'app-acces-refuse',
  imports: [RouterLink],
  template: `
    <section class="entete-page">
      <h2>Cet ecran ne vous est pas destine</h2>
      <p class="sous-titre">
        Votre jeton ne porte pas le role attendu. Roles presents :
        <code>{{ session.roles().join(', ') || 'aucun' }}</code>.
      </p>
    </section>

    <p class="note">
      Rappel : cette redirection est purement cosmetique. Meme sans elle, la gateway et l'API
      auraient repondu 403.
    </p>

    <a class="bouton bouton--principal" routerLink="/">Retour au catalogue</a>
  `,
})
export class AccesRefuse {
  protected readonly session = inject(SessionService);
}
