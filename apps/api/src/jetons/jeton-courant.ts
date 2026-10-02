import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';

/** Jeton d'accès présenté dans `Authorization: Bearer <jeton>`, ou `undefined`. */
export const JetonCourant = createParamDecorator(
  (_donnees: unknown, contexte: ExecutionContext): string | undefined =>
    ExtractJwt.fromAuthHeaderAsBearerToken()(contexte.switchToHttp().getRequest<Request>()) ?? undefined,
);
