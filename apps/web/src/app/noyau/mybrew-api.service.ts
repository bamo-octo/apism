import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { CONFIGURATION_APPLICATION } from '../configuration/configuration-application';
import type { Boisson, Preparation } from './modeles';

/** Unique point d'entrée vers l'API MyBrew. */
@Injectable({ providedIn: 'root' })
export class MyBrewApiService {
  private readonly http = inject(HttpClient);
  private readonly urlApi = inject(CONFIGURATION_APPLICATION).urlApi.replace(/\/$/, '');

  boissons(): Observable<Boisson[]> {
    return this.http.get<Boisson[]>(`${this.urlApi}/boissons`);
  }

  preparer(idBoisson: string, sucres: number): Observable<Preparation> {
    return this.http.post<Preparation>(`${this.urlApi}/preparations`, {
      idBoisson,
      sucres,
    });
  }

  preparations(): Observable<Preparation[]> {
    return this.http.get<Preparation[]>(`${this.urlApi}/preparations`);
  }
}
