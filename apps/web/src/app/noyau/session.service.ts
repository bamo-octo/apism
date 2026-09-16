import { Injectable, computed, inject, signal } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';

/** Revendications utiles du jeton d'acces Keycloak. */
export interface JetonDecode {
  sub: string;
  iss: string;
  aud: string | string[];
  azp?: string;
  exp: number;
  iat: number;
  scope?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  realm_access?: { roles?: string[] };
}

/**
 * Decode la charge utile d'un JWT sans en verifier la signature.
 *
 * A n'utiliser QUE pour afficher des informations dans l'interface : la SPA
 * n'est pas une frontiere de securite, la verification a lieu cote gateway et
 * cote API. C'est un des points cles du TP.
 */
export const decoderJeton = (jeton: string): JetonDecode | null => {
  const parties = jeton.split('.');

  if (parties.length !== 3) {
    return null;
  }

  try {
    const chargeUtile = parties[1].replace(/-/g, '+').replace(/_/g, '/');
    const texte = decodeURIComponent(
      atob(chargeUtile)
        .split('')
        .map((caractere) => `%${`00${caractere.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );

    return JSON.parse(texte) as JetonDecode;
  } catch {
    return null;
  }
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly oidc = inject(OidcSecurityService);
  private readonly configuration = inject(CONFIGURATION_APPLICATION);

  private readonly jetonBrut = signal<string | null>(null);

  readonly authentificationActivee = this.configuration.authentificationActivee;
  readonly estAuthentifie = signal(false);
  readonly jeton = computed(() => {
    const brut = this.jetonBrut();
    return brut ? decoderJeton(brut) : null;
  });

  readonly nomAffiche = computed(() => {
    const jeton = this.jeton();
    return jeton?.name ?? jeton?.preferred_username ?? 'Invite';
  });

  readonly roles = computed(() => this.jeton()?.realm_access?.roles ?? []);
  readonly scopes = computed(() => (this.jeton()?.scope ?? '').split(' ').filter(Boolean));

  readonly expiration = computed(() => {
    const jeton = this.jeton();
    return jeton ? new Date(jeton.exp * 1000) : null;
  });

  /** Rafraichit l'etat de session a partir de la librairie OIDC. */
  initialiser(): void {
    if (!this.authentificationActivee) {
      return;
    }

    this.oidc.checkAuth().subscribe((resultat) => {
      this.estAuthentifie.set(resultat.isAuthenticated);
      this.jetonBrut.set(resultat.accessToken ?? null);
    });

    // Le jeton est renouvele silencieusement : on suit ses changements.
    this.oidc.userData$.subscribe(() => {
      this.oidc.getAccessToken().subscribe((jeton) => this.jetonBrut.set(jeton || null));
    });
  }

  aLeRole(role: string): boolean {
    // Sans authentification (premieres etapes du TP), l'interface montre tout.
    return this.authentificationActivee ? this.roles().includes(role) : true;
  }

  connexion(): void {
    this.oidc.authorize();
  }

  deconnexion(): void {
    this.oidc.logoff().subscribe();
  }

  /** Copie du jeton brut, pour le coller dans jwt.io ou dans un curl. */
  jetonBrutCourant(): string | null {
    return this.jetonBrut();
  }
}
