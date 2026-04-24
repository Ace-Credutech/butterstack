import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMark } from '../../atoms/brand-mark/brand-mark';
import { AuthAside } from '../auth-aside/auth-aside';

@Component({
  selector:    'bs-auth-shell',
  imports:     [RouterLink, BrandMark, AuthAside],
  templateUrl: './auth-shell.html',
})
export class AuthShell {
  readonly aside_heading  = input.required<string>();
  readonly aside_subline  = input.required<string>();
  readonly aside_footline = input.required<string>();
  readonly top_link_label = input.required<string>();
  readonly top_link_path  = input.required<string>();
}
