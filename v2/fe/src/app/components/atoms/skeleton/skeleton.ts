import { Component, input } from '@angular/core';

@Component({
  selector:    'bs-skeleton',
  templateUrl: './skeleton.html',
})
export class Skeleton {
  readonly width  = input<string>('100%');
  readonly height = input<string>('14px');
  readonly round  = input<'sm' | 'md' | 'full'>('sm');
}
