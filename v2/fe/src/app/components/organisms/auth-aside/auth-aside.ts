import { Component, input } from '@angular/core';
import { BrandMark } from '../../atoms/brand-mark/brand-mark';

@Component({
  selector:    'bs-auth-aside',
  imports:     [BrandMark],
  templateUrl: './auth-aside.html',
  host: { style: 'display: contents' },
})
export class AuthAside {
  readonly heading  = input.required<string>();
  readonly subline  = input.required<string>();
  readonly footline = input.required<string>();
}
