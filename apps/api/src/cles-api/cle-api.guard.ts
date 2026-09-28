import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CLES_API } from './cles-api.js';

@Injectable()
export class CleApiGuard implements CanActivate {
  canActivate(contexte: ExecutionContext): boolean {
    const cleApi = contexte.switchToHttp().getRequest<Request>().header('x-api-key');

    if (!cleApi) {
      throw new UnauthorizedException("Clé d'API manquante.");
    }

    if (!CLES_API.includes(cleApi)) {
      throw new ForbiddenException("Clé d'API inconnue.");
    }

    return true;
  }
}
