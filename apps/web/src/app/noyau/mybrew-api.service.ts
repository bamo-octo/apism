import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';
import type {
  Boisson,
  EtatMachine,
  OperationEntretien,
  Preparation,
  Profil,
  Statistiques,
} from './modeles';

/**
 * Unique point d'entree vers l'API MyBrew.
 *
 * L'URL de base vient de la configuration d'execution : appel direct de l'API
 * au debut du TP, puis appel de la gateway Gravitee une fois celle-ci en place.
 */
@Injectable({ providedIn: 'root' })
export class MyBrewApiService {
  private readonly http = inject(HttpClient);
  private readonly urlApi = inject(CONFIGURATION_APPLICATION).urlApi.replace(/\/$/, '');

  boissons(): Observable<Boisson[]> {
    return this.http.get<Boisson[]>(`${this.urlApi}/boissons`);
  }

  etatMachine(): Observable<EtatMachine> {
    return this.http.get<EtatMachine>(`${this.urlApi}/machine/etat`);
  }

  entretenir(operations: OperationEntretien): Observable<EtatMachine> {
    return this.http.post<EtatMachine>(`${this.urlApi}/machine/entretien`, operations);
  }

  preparer(identifiantBoisson: string, sucres: number): Observable<Preparation> {
    return this.http.post<Preparation>(`${this.urlApi}/preparations`, {
      identifiantBoisson,
      sucres,
    });
  }

  preparations(toutes = false): Observable<Preparation[]> {
    return this.http.get<Preparation[]>(`${this.urlApi}/preparations`, {
      params: toutes ? { toutes: true } : {},
    });
  }

  purgerPreparations(): Observable<{ nombreSupprime: number }> {
    return this.http.delete<{ nombreSupprime: number }>(`${this.urlApi}/preparations`);
  }

  statistiques(): Observable<Statistiques> {
    return this.http.get<Statistiques>(`${this.urlApi}/statistiques`);
  }

  profil(): Observable<Profil> {
    return this.http.get<Profil>(`${this.urlApi}/moi`);
  }
}
