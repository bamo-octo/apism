import { BadGatewayException, HttpException, Injectable, Logger } from '@nestjs/common';
import { AUDIENCE, URL_JETONS } from '../jetons/keycloak.js';
import type { Boisson } from './boisson.js';

const URL_CATALOGUE = process.env.CATALOGUE_URL ?? 'http://localhost:3001';

/** Jeton envoyé au catalogue : aucun (vide), le jeton reçu tel quel (`transmettre`) ou un jeton obtenu par token exchange (`echanger`). */
const JETON_POUR_CATALOGUE = process.env.CATALOGUE_JETON ?? '';

@Injectable()
export class CatalogueService {
  private readonly logger = new Logger(CatalogueService.name);

  lister(jeton?: string): Promise<Boisson[]> {
    return this.appeler('GET', '/boissons', jeton);
  }

  trouver(id: string, jeton?: string): Promise<Boisson> {
    return this.appeler('GET', `/boissons/${encodeURIComponent(id)}`, jeton);
  }

  ajouter(boisson: Boisson, jeton?: string): Promise<Boisson> {
    return this.appeler('POST', '/boissons', jeton, boisson);
  }

  async supprimer(id: string, jeton?: string): Promise<void> {
    await this.appeler('DELETE', `/boissons/${encodeURIComponent(id)}`, jeton);
  }

  private async appeler<T>(methode: string, chemin: string, jeton?: string, corps?: Boisson): Promise<T> {
    const jetonCatalogue = await this.jetonPourCatalogue(jeton);
    const reponse = await fetch(`${URL_CATALOGUE}${chemin}`, {
      method: methode,
      headers: {
        'Content-Type': 'application/json',
        ...(jetonCatalogue && { Authorization: `Bearer ${jetonCatalogue}` }),
      },
      body: corps && JSON.stringify(corps),
    });

    if (reponse.status === 401) {
      this.logger.error('Jeton refusé par le catalogue.');
      throw new BadGatewayException('Catalogue indisponible.');
    }
    if (!reponse.ok) {
      const { message } = (await reponse.json()) as { message: string };
      throw new HttpException(message, reponse.status);
    }
    return (reponse.status === 204 ? undefined : await reponse.json()) as T;
  }

  private async jetonPourCatalogue(jeton?: string): Promise<string | undefined> {
    if (JETON_POUR_CATALOGUE === 'transmettre') {
      return jeton;
    }
    if (JETON_POUR_CATALOGUE !== 'echanger' || !jeton) {
      return undefined;
    }

    const reponse = await fetch(URL_JETONS, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        client_id: AUDIENCE,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
        subject_token: jeton,
        subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        audience: 'catalogue',
      }),
    });
    const resultat = (await reponse.json()) as { access_token?: string; error?: string; error_description?: string };

    if (!resultat.access_token) {
      this.logger.error(`Échange de jeton refusé : ${resultat.error_description ?? resultat.error}`);
      throw new BadGatewayException('Catalogue indisponible.');
    }
    return resultat.access_token;
  }
}
