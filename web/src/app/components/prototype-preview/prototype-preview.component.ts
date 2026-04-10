import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core'
import { TitleCasePipe }                              from '@angular/common'
import { DomSanitizer, SafeHtml }                     from '@angular/platform-browser'
import type { UITokens }                              from '../../models/ui-tokens.model'
import { renderTokens }                               from '../../renderers/index'

type Viewport = 'desktop' | 'tablet' | 'mobile'

@Component({
  selector:    'app-prototype-preview',
  standalone:  true,
  imports:     [TitleCasePipe],
  templateUrl: './prototype-preview.component.html',
})
export class PrototypePreviewComponent implements OnChanges {
  @Input() tokens:   UITokens | null = null
  @Input() loading = false
  @Input() source  = ''

  safeHtml:    SafeHtml | null = null
  viewport:    Viewport = 'desktop'
  rawHtml      = ''

  constructor(private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tokens'] && this.tokens) {
      this.rawHtml  = renderTokens(this.tokens)
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(this.rawHtml)
      this.cdr.detectChanges()
    }
  }

  setViewport(vp: string): void { this.viewport = vp as Viewport }

  copyHtml(): void {
    navigator.clipboard.writeText(this.rawHtml)
  }

  get wrapperWidth(): string {
    return { desktop: '100%', tablet: '768px', mobile: '375px' }[this.viewport]
  }
}
