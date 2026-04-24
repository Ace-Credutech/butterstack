import { Component, input } from '@angular/core';

@Component({
  selector:    'bs-error-alert',
  templateUrl: './error-alert.html',
})
export class ErrorAlert {
  readonly message = input<string | null>(null);
}
