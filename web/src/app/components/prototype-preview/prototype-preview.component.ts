import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, ElementRef, signal } from '@angular/core'
import { DomSanitizer, SafeHtml }  from '@angular/platform-browser'
import type { UITokens }           from '../../models/ui-tokens.model'
import { renderTokens }            from '../../renderers/index'
import { ApiService }              from '../../services/api.service'
import { type DesignSystem, DEFAULT_DESIGN } from '../../renderers/components.renderer'

type Viewport = 'desktop' | 'tablet' | 'mobile'
type CenterTab = 'prototype' | 'brd' | 'excel' | 'mindmap'

@Component({
  selector:    'app-prototype-preview',
  standalone:  true,
  imports:     [],
  templateUrl: './prototype-preview.component.html',
})
export class PrototypePreviewComponent implements OnChanges {
  @Input() tokens:    UITokens | null = null
  @Input() loading   = false
  @Input() source    = ''
  @Input() projectId = ''

  activeTab       = signal<CenterTab>('prototype')
  safeHtml:         SafeHtml | null = null
  viewport:         Viewport = 'desktop'
  rawHtml           = ''
  protoFullscreen   = false

  brdHtml     = signal<SafeHtml | null>(null)
  brdLoading  = signal(false)

  excelData   = signal<any>(null)
  excelLoading = signal(false)

  mindmapHtml  = signal<SafeHtml | null>(null)
  mindmapLoading = signal(false)
  designSystem: DesignSystem = DEFAULT_DESIGN
  private dsLoaded = false

  constructor(
    private sanitizer: DomSanitizer,
    private cdr:       ChangeDetectorRef,
    private el:        ElementRef,
    private api:       ApiService,
  ) {
    document.addEventListener('fullscreenchange', () => {
      this.protoFullscreen = !!document.fullscreenElement
      this.cdr.detectChanges()
    })
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['projectId'] && this.projectId) {
      this.dsLoaded = false
    }
    if (changes['tokens'] && this.tokens) {
      if (!this.dsLoaded && this.projectId) {
        try {
          this.designSystem = await this.api.get<DesignSystem>(`/projects/${this.projectId}/design-system`)
        } catch {}
        this.dsLoaded = true
      }
      this.rawHtml  = renderTokens(this.tokens, this.designSystem)
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(this.rawHtml)
      this.cdr.detectChanges()
    }
  }

  async reloadDesignSystem() {
    if (!this.projectId) return
    try {
      this.designSystem = await this.api.get<DesignSystem>(`/projects/${this.projectId}/design-system`)
    } catch {}
    this.dsLoaded = true
    if (this.tokens) {
      this.rawHtml  = renderTokens(this.tokens, this.designSystem)
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(this.rawHtml)
      this.cdr.detectChanges()
    }
  }

  async setTab(tab: CenterTab) {
    this.activeTab.set(tab)
    if (tab === 'brd' && !this.brdHtml()) await this.loadBrd()
    if (tab === 'excel' && !this.excelData()) await this.loadExcel()
    if (tab === 'mindmap' && !this.mindmapHtml()) await this.loadMindmap()
  }

  async loadBrd() {
    this.brdLoading.set(true)
    try {
      const token = localStorage.getItem('bs_token')
      const res = await fetch(`/api/exports/brd?projectId=${this.projectId}&token=${token}`)
      const html = await res.text()
      this.brdHtml.set(this.sanitizer.bypassSecurityTrustHtml(html))
    } catch {} finally { this.brdLoading.set(false) }
  }

  async loadExcel() {
    this.excelLoading.set(true)
    try {
      this.excelData.set(await this.api.get('/exports/excel', { projectId: this.projectId, format: 'json' }))
    } catch {} finally { this.excelLoading.set(false) }
  }

  async loadMindmap() {
    this.mindmapLoading.set(true)
    try {
      const token = localStorage.getItem('bs_token')
      const res = await fetch(`/api/exports/mindmap?projectId=${this.projectId}&token=${token}`)
      const html = await res.text()
      this.mindmapHtml.set(this.sanitizer.bypassSecurityTrustHtml(html))
    } catch {} finally { this.mindmapLoading.set(false) }
  }

  downloadBrd() {
    const token = localStorage.getItem('bs_token')
    window.open(`/api/exports/brd?projectId=${this.projectId}&token=${token}`, '_blank')
  }

  async downloadExcel() {
    const token = localStorage.getItem('bs_token')
    const res = await fetch(`/api/exports/excel?projectId=${this.projectId}&token=${token}`)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'butterstack-export.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  downloadMindmap() {
    const token = localStorage.getItem('bs_token')
    window.open(`/api/exports/mindmap?projectId=${this.projectId}&token=${token}`, '_blank')
  }

  refreshTab() {
    this.brdHtml.set(null)
    this.excelData.set(null)
    this.mindmapHtml.set(null)
    const tab = this.activeTab()
    if (tab === 'brd') this.loadBrd()
    if (tab === 'excel') this.loadExcel()
    if (tab === 'mindmap') this.loadMindmap()
  }

  setViewport(vp: string): void { this.viewport = vp as Viewport }
  copyHtml(): void { navigator.clipboard.writeText(this.rawHtml) }

  toggleProtoFullscreen(): void {
    const panel = this.el.nativeElement as HTMLElement
    if (!document.fullscreenElement) panel.requestFullscreen()
    else document.exitFullscreen()
  }

  objectKeys(obj: any): string[] { return obj ? Object.keys(obj) : [] }

  get wrapperWidth(): string {
    return { desktop: '100%', tablet: '768px', mobile: '375px' }[this.viewport]
  }
}
