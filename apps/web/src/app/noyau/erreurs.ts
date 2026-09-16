import { HttpErrorResponse } from '@angular/common/http';

export interface ErreurAffichable {
  titre: string;
  detail: string;
  /** En-tetes renvoyes par Gravitee, tres utiles pendant le TP. */
  indices: Record<string, string>;
}

const EN_TETES_INTERESSANTS = [
  'x-rate-limit-limit',
  'x-rate-limit-remaining',
  'x-rate-limit-reset',
  'x-quota-limit',
  'x-quota-remaining',
  'x-quota-reset',
  'retry-after',
];

const detailDuCorps = (erreur: HttpErrorResponse): string => {
  const corps: unknown = erreur.error;

  if (typeof corps === 'string' && corps.length > 0) {
    return corps;
  }

  if (corps && typeof corps === 'object') {
    const message = (corps as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return erreur.message;
};

/**
 * Traduit une erreur HTTP en message comprehensible.
 * Les codes 401, 403, 429 et 503 sont exactement ceux que les participants
 * vont provoquer volontairement au fil des etapes.
 */
export const decrireErreur = (erreur: unknown): ErreurAffichable => {
  if (!(erreur instanceof HttpErrorResponse)) {
    return { titre: 'Erreur inattendue', detail: String(erreur), indices: {} };
  }

  const indices: Record<string, string> = {};

  for (const nom of EN_TETES_INTERESSANTS) {
    const valeur = erreur.headers.get(nom);

    if (valeur) {
      indices[nom] = valeur;
    }
  }

  const detail = detailDuCorps(erreur);

  switch (erreur.status) {
    case 0:
      return {
        titre: 'Appel bloque',
        detail:
          "Aucune reponse : verifiez l'URL de l'API dans configuration.json, et la configuration CORS de la gateway.",
        indices,
      };
    case 401:
      return {
        titre: 'Non authentifie (401)',
        detail: `Le jeton est absent, expire ou refuse. ${detail}`,
        indices,
      };
    case 403:
      return {
        titre: 'Non autorise (403)',
        detail: `Le jeton est valide mais il manque un role ou un scope. ${detail}`,
        indices,
      };
    case 429:
      return {
        titre: 'Trop de demandes (429)',
        detail:
          "La gateway a applique une limite de debit ou un quota. Laissez la machine respirer un instant.",
        indices,
      };
    case 503:
      return { titre: 'Machine indisponible (503)', detail, indices };
    default:
      return { titre: `Erreur ${erreur.status}`, detail, indices };
  }
};
