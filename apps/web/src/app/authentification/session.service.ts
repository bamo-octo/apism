import { Injectable, inject, signal } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';
import { authentificationActivee } from './authentification';

/** Claims de l'ID token utilisés pour présenter l'utilisateur. */
export interface IdentiteUtilisateur {
  given_name?: string;
  family_name?: string;
  boisson_preferee?: string;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly oidc = authentificationActivee(inject(CONFIGURATION_APPLICATION))
    ? inject(OidcSecurityService)
    : null;

  readonly connecte = signal(false);
  readonly utilisateur = signal<IdentiteUtilisateur | null>(null);
  readonly erreurConnexion = signal(new URLSearchParams(window.location.search).get('error_description'));

  /** Redirige vers la page de connexion si l'utilisateur n'est pas encore connecté et que Keycloak n'a pas renvoyé d'erreur. */
  async ouvrir(): Promise<void> {
    if (!this.oidc) {
      return;
    }

    const { isAuthenticated, userData } = await firstValueFrom(this.oidc.checkAuth());
    this.connecte.set(isAuthenticated);
    this.utilisateur.set(userData as IdentiteUtilisateur | null);

    if (!isAuthenticated && !this.erreurConnexion()) {
      this.oidc.authorize();
    }
  }

  fermer(): void {
    this.oidc?.logoff().subscribe();
  }
}
