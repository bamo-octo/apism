import type { Routes } from '@angular/router';
import { garderAuthentification, garderRole } from './noyau/gardes';

export const routes: Routes = [
  {
    path: '',
    title: 'MyBrew - catalogue',
    loadComponent: () => import('./pages/accueil').then((module) => module.Accueil),
  },
  {
    path: 'historique',
    title: 'MyBrew - historique',
    canActivate: [garderAuthentification],
    loadComponent: () =>
      import('./pages/mes-preparations').then((module) => module.MesPreparations),
  },
  {
    path: 'machine',
    title: 'MyBrew - machine',
    canActivate: [garderAuthentification],
    loadComponent: () => import('./pages/machine').then((module) => module.Machine),
  },
  {
    path: 'statistiques',
    title: 'MyBrew - statistiques',
    canActivate: [garderAuthentification, garderRole('administrateur')],
    loadComponent: () => import('./pages/statistiques').then((module) => module.Statistiques),
  },
  {
    path: 'mon-jeton',
    title: 'MyBrew - mon jeton',
    loadComponent: () => import('./pages/mon-jeton').then((module) => module.MonJeton),
  },
  {
    path: 'acces-refuse',
    title: 'MyBrew - acces refuse',
    loadComponent: () => import('./pages/acces-refuse').then((module) => module.AccesRefuse),
  },
  { path: '**', redirectTo: '' },
];
