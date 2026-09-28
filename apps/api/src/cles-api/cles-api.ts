/** Clés d'API acceptées, lues depuis la variable d'environnement CLES_API (séparées par des virgules). */
export const CLES_API: string[] = (process.env.CLES_API ?? '')
  .split(',')
  .map((cle) => cle.trim())
  .filter(Boolean);
