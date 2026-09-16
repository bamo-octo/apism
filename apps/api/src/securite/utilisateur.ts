/** Roles metier portes par le realm Keycloak `mybrew`. */
export const ROLES = {
  buveur: 'buveur',
  technicien: 'technicien',
  administrateur: 'administrateur',
} as const;

/** Scopes OAuth 2.0 exposes par le serveur d'autorisation. */
export const SCOPES = {
  preparerBoisson: 'boisson:preparer',
  entretenirMachine: 'machine:entretenir',
  lireStatistiques: 'statistiques:lire',
  envoyerTelemetrie: 'machine:telemetrie',
} as const;

/**
 * Utilisateur (ou service) authentifie, reconstruit a partir du jeton d'acces.
 * Aucune base de donnees : le jeton est la seule source de verite.
 */
export interface Utilisateur {
  /** Revendication `sub` du jeton. */
  identifiant: string;
  /** `preferred_username` : `alice` ou `service-account-mybrew-sonde`. */
  nomUtilisateur: string;
  /** `name` si le mapper est present, sinon le nom d'utilisateur. */
  nomAffiche: string;
  courriel?: string;
  /** `realm_access.roles` filtre des roles techniques de Keycloak. */
  roles: string[];
  /** Revendication `scope`, decoupee. */
  scopes: string[];
  /** `azp` : identifiant du client OAuth a l'origine du jeton. */
  clientOAuth: string;
  /** Vrai lorsque le jeton provient d'un flow `client_credentials`. */
  estUnService: boolean;
}

/** Forme (partielle) d'un jeton d'acces Keycloak. */
export interface ChargeUtileJeton {
  sub: string;
  iss: string;
  aud: string | string[];
  azp?: string;
  exp: number;
  scope?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
}

/** Roles techniques ajoutes par defaut par Keycloak, sans interet metier. */
const ROLES_TECHNIQUES = new Set([
  'offline_access',
  'uma_authorization',
  'default-roles-mybrew',
]);

export const construireUtilisateur = (charge: ChargeUtileJeton): Utilisateur => {
  const nomUtilisateur = charge.preferred_username ?? charge.sub;

  return {
    identifiant: charge.sub,
    nomUtilisateur,
    nomAffiche: charge.name ?? nomUtilisateur,
    courriel: charge.email,
    roles: (charge.realm_access?.roles ?? []).filter((role) => !ROLES_TECHNIQUES.has(role)),
    scopes: (charge.scope ?? '').split(' ').filter((scope) => scope.length > 0),
    clientOAuth: charge.azp ?? 'inconnu',
    estUnService: nomUtilisateur.startsWith('service-account-'),
  };
};
