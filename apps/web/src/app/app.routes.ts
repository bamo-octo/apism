import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'MyBrew - catalogue',
    loadComponent: () => import('./pages/accueil').then((module) => module.Accueil),
  },
  {
    path: 'historique',
    title: 'MyBrew - historique',
    loadComponent: () => import('./pages/historique').then((module) => module.Historique),
  },
  { path: '**', redirectTo: '' },
];
