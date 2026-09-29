import { Injectable, inject, signal } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';
import { authentificationActivee } from './authentification';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly oidc = authentificationActivee(inject(CONFIGURATION_APPLICATION))
    ? inject(OidcSecurityService)
    : null;

  readonly connecte = signal(false);

  /** Redirige vers la page de connexion si l'utilisateur n'est pas encore connecté. */
  ouvrir(): void {
    this.oidc?.checkAuth().subscribe(({ isAuthenticated }) => {
      this.connecte.set(isAuthenticated);

      if (!isAuthenticated) {
        this.oidc?.authorize();
      }
    });
  }

  fermer(): void {
    this.oidc?.logoff().subscribe();
  }
}
