import { Component, input } from '@angular/core';
import type { ErreurAffichable } from '../noyau/erreurs';

/** Affiche une erreur d'API. */
@Component({
  selector: 'app-message-erreur',
  template: `
    @if (erreur(); as details) {
      <div class="alerte" role="alert">
        <p class="alerte__titre">{{ details.titre }}</p>
        <p class="alerte__detail">{{ details.detail }}</p>
      </div>
    }
  `,
})
export class MessageErreur {
  readonly erreur = input<ErreurAffichable | null>(null);
}
