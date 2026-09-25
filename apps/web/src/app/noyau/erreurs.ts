import { HttpErrorResponse } from '@angular/common/http';

export interface ErreurAffichable {
  titre: string;
  detail: string;
}

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

export const decrireErreur = (erreur: unknown): ErreurAffichable => {
  if (!(erreur instanceof HttpErrorResponse)) {
    return { titre: 'Erreur inattendue', detail: String(erreur) };
  }

  if (erreur.status === 0) {
    return {
      titre: 'Appel bloque',
      detail: "Aucune reponse : verifiez l'URL de l'API dans configuration.json.",
    };
  }

  return { titre: `Erreur ${erreur.status}`, detail: detailDuCorps(erreur) };
};
