import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CONFIGURATION_APPLICATION } from './configuration/configuration-application';
import { SessionService } from './noyau/session.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly session = inject(SessionService);
  protected readonly configuration = inject(CONFIGURATION_APPLICATION);

  constructor() {
    this.session.initialiser();
  }
}
