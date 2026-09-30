import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from './authentification/session.service';
import { CONFIGURATION_APPLICATION } from './configuration/configuration-application';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly configuration = inject(CONFIGURATION_APPLICATION);
  protected readonly session = inject(SessionService);
}
