import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShortcutCheatsheet } from './components/organisms/shortcut-cheatsheet/shortcut-cheatsheet';

@Component({
  selector:    'app-root',
  imports:     [RouterOutlet, ShortcutCheatsheet],
  templateUrl: './app.html',
})
export class App {}
