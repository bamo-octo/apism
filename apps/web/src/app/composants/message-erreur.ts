import { Component, input } from '@angular/core';
import type { ErreurAffichable } from '../noyau/erreurs';

/** Affiche une erreur d'API avec les en-tetes renvoyes par la gateway. */
@Component({
  selector: 'app-message-erreur',
  template: `
    @if (erreur(); as details) {
      <div class="alerte" role="alert">
        <p class="alerte__titre">{{ details.titre }}</p>
        <p class="alerte__detail">{{ details.detail }}</p>
        @if (indices(details).length > 0) {
          <ul class="alerte__indices">
            @for (indice of indices(details); track indice[0]) {
              <li><code>{{ indice[0] }}</code> : {{ indice[1] }}</li>
            }
          </ul>
        }
      </div>
    }
  `,
})
export class MessageErreur {
  readonly erreur = input<ErreurAffichable | null>(null);

  protected indices(details: ErreurAffichable): [string, string][] {
    return Object.entries(details.indices);
  }
}
