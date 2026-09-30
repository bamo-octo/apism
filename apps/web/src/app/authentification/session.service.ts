import { Injectable, inject, signal } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';
import { authentificationActivee } from './authentification';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly oidc = authentificationActivee(inject(CONFIGURATION_APPLICATION))
    ? inject(OidcSecurityService)
    : null;

  readonly connecte = signal(false);

  /** Redirige vers la page de connexion si l'utilisateur n'est pas encore connecté. */
  async ouvrir(): Promise<void> {
    if (!this.oidc) {
      return;
    }

    const { isAuthenticated } = await firstValueFrom(this.oidc.checkAuth());
    this.connecte.set(isAuthenticated);

    if (!isAuthenticated) {
      this.oidc.authorize();
    }
  }

  fermer(): void {
    this.oidc?.logoff().subscribe();
  }
}
