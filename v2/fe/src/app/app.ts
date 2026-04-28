import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShortcutCheatsheet } from './components/organisms/shortcut-cheatsheet/shortcut-cheatsheet';
import { AuthService } from './services/auth.service';
import { WsService }   from './services/ws.service';

@Component({
  selector:    'app-root',
  imports:     [RouterOutlet, ShortcutCheatsheet],
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly ws   = inject(WsService);

  constructor() {
    effect(() => {
      if (this.auth.authenticated()) {
        this.ws.connect();
      } else {
        this.ws.disconnect();
      }
    });
  }
}
