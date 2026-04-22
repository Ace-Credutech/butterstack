import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, ElementRef, HostListener, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { DomSanitizer, SafeHtml }  from '@angular/platform-browser'
import type { UITokens }           from '../../models/ui-tokens.model'
import { renderTokens }            from '../../renderers/index'
import { normalizeTokens }         from '../../renderers/dynamic.renderer'
import { ApiService }              from '../../services/api.service'
import { type DesignSystem, type PrototypeContext, DEFAULT_DESIGN } from '../../renderers/components.renderer'
import { environment }             from '../../../environments/environment'

type Viewport = 'desktop' | 'tablet' | 'mobile'
type CenterTab = 'details' | 'prototype' | 'brd' | 'excel' | 'mindmap'

@Component({
  selector:    'app-prototype-preview',
  standalone:  true,
  imports:     [FormsModule],
  templateUrl: './prototype-preview.component.html',
})
export class PrototypePreviewComponent implements OnChanges {
  @Input() tokens:    UITokens | null = null
  @Input() loading   = false
  @Input() source    = ''
  @Input() projectId = ''
  @Input() scopeModuleId: number | null = null
  @Input() scopePageId: number | null = null
  @Input() scopeFeatureId: number | null = null
  @Input() relatedPages: { id: number; name: string; pageType: string; tokens?: any }[] = []
  @Input() selectedContext = ''
  @Input() detailsModule: any = null
  @Input() detailsFeature: any = null
  @Input() moduleFeatures: any[] = []
  @Output() pageClicked = new EventEmitter<{ id: number; name: string; tokens?: any }>()
  @Output() featureClicked = new EventEmitter<number>()
  @Output() quizRequested = new EventEmitter<{ featureId: number; featureName: string; currentFcs: number }>()
  @Output() fieldEdited = new EventEmitter<{ entityType: string; entityId: number; field: string; value: string }>()
  @Output() tabChanged = new EventEmitter<CenterTab>()
  @Output() entityRenamed = new EventEmitter<{ type: 'feature' | 'module'; id: number; name: string }>()

  // Details inline rename
  renamingDetailsFeature = signal(false)
  renamingDetailsModule  = signal(false)
  detailsRenameText = ''

  startDetailsRename() {
    if (this.detailsFeature) { this.detailsRenameText = this.detailsFeature.name; this.renamingDetailsFeature.set(true) }
    else if (this.detailsModule) { this.detailsRenameText = this.detailsModule.name; this.renamingDetailsModule.set(true) }
  }
  cancelDetailsRename() { this.renamingDetailsFeature.set(false); this.renamingDetailsModule.set(false); this.detailsRenameText = '' }
  async confirmDetailsRename() {
    const name = this.detailsRenameText.trim()
    if (!name) { this.cancelDetailsRename(); return }
    if (this.renamingDetailsFeature() && this.detailsFeature) {
      try {
        await this.api.patch(`/features/${this.detailsFeature.id}`, { name })
        this.detailsFeature = { ...this.detailsFeature, name }
        this.entityRenamed.emit({ type: 'feature', id: this.detailsFeature.id, name })
      } catch { alert('Rename failed.') }
    } else if (this.renamingDetailsModule() && this.detailsModule) {
      try {
        await this.api.patch(`/modules/${this.detailsModule.id}`, { name })
        this.detailsModule = { ...this.detailsModule, name }
        this.entityRenamed.emit({ type: 'module', id: this.detailsModule.id, name })
      } catch { alert('Rename failed.') }
    }
    this.cancelDetailsRename()
  }
  onDetailsRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); this.confirmDetailsRename() }
    if (e.key === 'Escape') { e.preventDefault(); this.cancelDetailsRename() }
  }

  Math = Math
  activeTab       = signal<CenterTab>('prototype')
  safeHtml:         SafeHtml | null = null
  viewport:         Viewport = 'desktop'
  rawHtml           = ''
  protoFullscreen   = false

  brdHtml     = signal<SafeHtml | null>(null)
  brdRaw      = ''
  brdLoading  = signal(false)

  excelData   = signal<any>(null)
  excelLoading = signal(false)

  mindmapHtml  = signal<SafeHtml | null>(null)
  mindmapLoading = signal(false)
  reprocessing = signal(false)
  reprocessStep = signal('')
  designSystem: DesignSystem = DEFAULT_DESIGN
  protoContext: PrototypeContext = {}
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
    if (changes['scopeFeatureId'] || changes['scopePageId'] || changes['projectId']) {
      this.editingPageId = null
    }
    if (changes['tokens'] && this.tokens) {
      if (!this.dsLoaded && this.projectId) {
        try {
          this.designSystem = await this.api.get<DesignSystem>(`/projects/${this.projectId}/design-system`)
          this.protoContext = await this.api.get<PrototypeContext>(`/projects/${this.projectId}/prototype-context`)
        } catch {}
        this.dsLoaded = true
      }
      // Normalize: infer + persist section roles on first load so rendering becomes text-independent.
      const norm = normalizeTokens(this.tokens)
      if (norm.changed) {
        this.tokens = norm.tokens
        const pid = await this.resolveEditingPageId()
        if (pid) this.api.patch(`/pages/${pid}`, { tokens: this.tokens }).catch(() => {})
      }
      this.rawHtml  = renderTokens(this.tokens, this.designSystem, this.protoContext)
      const fullHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>body{margin:0;font-family:'Inter',system-ui,sans-serif}</style></head><body>${this.rawHtml}</body></html>`
      this.safeHtml = this.sanitizer.bypassSecurityTrustResourceUrl('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml))
      this.cdr.detectChanges()
    }
  }

  async reloadDesignSystem() {
    if (!this.projectId) return
    try {
      this.designSystem = await this.api.get<DesignSystem>(`/projects/${this.projectId}/design-system`)
      this.protoContext = await this.api.get<PrototypeContext>(`/projects/${this.projectId}/prototype-context`)
    } catch {}
    this.dsLoaded = true
    if (this.tokens) {
      this.rawHtml  = renderTokens(this.tokens, this.designSystem, this.protoContext)
      const fullHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>body{margin:0;font-family:'Inter',system-ui,sans-serif}</style></head><body>${this.rawHtml}</body></html>`
      this.safeHtml = this.sanitizer.bypassSecurityTrustResourceUrl('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml))
      this.cdr.detectChanges()
    }
  }

  async setTab(tab: CenterTab, emit = true) {
    this.activeTab.set(tab)
    if (emit) this.tabChanged.emit(tab)
    if (tab === 'brd') { this.brdHtml.set(null); await this.loadBrd() }
    if (tab === 'excel') { this.excelData.set(null); await this.loadExcel() }
    if (tab === 'mindmap') { this.mindmapHtml.set(null); await this.loadMindmap() }
  }

  private get apiBase(): string { return `${environment.url}/api` }

  private get scopeParams(): string {
    let params = `projectId=${this.projectId}`
    if (this.scopeModuleId) params += `&moduleId=${this.scopeModuleId}`
    if (this.scopePageId) params += `&pageId=${this.scopePageId}`
    if (this.scopeFeatureId) params += `&featureId=${this.scopeFeatureId}`
    return params
  }

  get scopeLabel(): string {
    if (this.scopeFeatureId) return 'feature'
    if (this.scopePageId) return 'page'
    if (this.scopeModuleId) return 'module'
    return 'project'
  }

  async loadBrd() {
    this.brdLoading.set(true)
    try {
      const token = localStorage.getItem('bs_token')
      // Always load full product-level BRD (spec requirement)
      const res = await fetch(`${this.apiBase}/exports/brd?projectId=${this.projectId}&token=${token}`)
      const html = await res.text()
      this.brdRaw = html
      this.brdHtml.set(this.sanitizer.bypassSecurityTrustResourceUrl(
        'data:text/html;charset=utf-8,' + encodeURIComponent(html)
      ))
    } catch {} finally { this.brdLoading.set(false) }
  }

  async loadExcel() {
    this.excelLoading.set(true)
    try {
      // Always product-level (spec requirement)
      this.excelData.set(await this.api.get('/exports/excel', { projectId: this.projectId, format: 'json' }))
    } catch {} finally { this.excelLoading.set(false) }
  }

  async loadMindmap() {
    this.mindmapLoading.set(true)
    try {
      const token = localStorage.getItem('bs_token')
      // Always product-level (spec requirement)
      const res = await fetch(`${this.apiBase}/exports/mindmap?projectId=${this.projectId}&token=${token}`)
      const html = await res.text()
      this.mindmapHtml.set(this.sanitizer.bypassSecurityTrustResourceUrl(
        'data:text/html;charset=utf-8,' + encodeURIComponent(html)
      ))
    } catch {} finally { this.mindmapLoading.set(false) }
  }

  downloadBrd() {
    const token = localStorage.getItem('bs_token')
    window.open(`${this.apiBase}/exports/brd?${this.scopeParams}&token=${token}`, '_blank')
  }

  async downloadExcel() {
    const token = localStorage.getItem('bs_token')
    const res = await fetch(`${this.apiBase}/exports/excel?${this.scopeParams}&token=${token}`)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'butterstack-export.xlsx'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  downloadMindmap() {
    const token = localStorage.getItem('bs_token')
    window.open(`${this.apiBase}/exports/mindmap?${this.scopeParams}&token=${token}`, '_blank')
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

  private editingPageId: number | null = null

  @HostListener('window:message', ['$event'])
  async onProtoMessage(ev: MessageEvent) {
    const d: any = ev.data
    if (!d || d.type !== 'prototype-edit' || typeof d.path !== 'string') return
    if (!this.tokens) { this.postAck(d.path, false); return }

    const pageId = await this.resolveEditingPageId()
    if (!pageId) { this.postAck(d.path, false); return }

    const next: any = this.cloneTokens(this.tokens)
    if (!this.setByPath(next, d.path, d.value)) {
      this.postAck(d.path, false)
      return
    }
    this.tokens = next
    try {
      await this.api.patch(`/pages/${pageId}`, { tokens: next })
      this.postAck(d.path, true)
    } catch {
      this.postAck(d.path, false)
    }
  }

  private async resolveEditingPageId(): Promise<number | null> {
    if (this.scopePageId) return this.scopePageId
    if (this.editingPageId) return this.editingPageId
    if (this.scopeFeatureId) {
      try {
        const allPages = await this.api.get<any[]>('/pages', { projectId: this.projectId })
        const linked = (allPages || []).filter((p: any) =>
          (p.features || []).some((f: any) => f.id === this.scopeFeatureId)
        )
        const target = linked.find((p: any) => p.tokens) || linked[0]
        if (target?.id) { this.editingPageId = target.id; return target.id }
      } catch {}
    }
    return null
  }

  private postAck(path: string, ok: boolean) {
    const iframe = this.el.nativeElement.querySelector('iframe') as HTMLIFrameElement | null
    iframe?.contentWindow?.postMessage({ type: 'prototype-edit-ack', path, ok }, '*')
  }

  private cloneTokens(t: any): any { return JSON.parse(JSON.stringify(t)) }

  private setByPath(obj: any, path: string, value: any): boolean {
    // Supports keys like: intent, entity, fields[2].name, actions[0], stats[1].label, uiText.signupPrompt
    const tokens = path.match(/[^.[\]]+/g) || []
    if (!tokens.length) return false
    let cur = obj
    for (let i = 0; i < tokens.length - 1; i++) {
      const k: any = /^\d+$/.test(tokens[i]) ? Number(tokens[i]) : tokens[i]
      if (cur[k] == null) {
        const nextIsIndex = /^\d+$/.test(tokens[i + 1])
        cur[k] = nextIsIndex ? [] : {}
      }
      cur = cur[k]
    }
    const last: any = tokens[tokens.length - 1]
    const lk: any = /^\d+$/.test(last) ? Number(last) : last
    cur[lk] = value
    return true
  }

  async reprocessPrototype() {
    const entityType = this.scopePageId ? 'page' : this.scopeFeatureId ? 'feature' : null
    const entityId = this.scopePageId || this.scopeFeatureId
    if (!entityType || !entityId) return

    this.reprocessing.set(true)
    this.reprocessStep.set('queued')
    try {
      const res = await this.api.post<{ jobId: number }>(`/reprocess/${entityType}/${entityId}`, {})
      // Poll job status until it finishes or times out
      const jobId = res.jobId
      const deadline = Date.now() + 90_000
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 1500))
        try {
          const job = await this.api.get<any>(`/reprocess/status/${jobId}`)
          this.reprocessStep.set(job.step || job.status)
          if (job.status === 'done' || job.status === 'failed') break
        } catch { break }
      }

      // Reload the affected entity's tokens — works for both page scope and feature scope.
      // Feature scope: find the linked page currently showing (or the first with tokens) and refresh it.
      let reloadedPage: any = null
      if (this.scopePageId) {
        reloadedPage = await this.api.get<any>(`/pages/${this.scopePageId}`).catch(() => null)
      } else if (this.scopeFeatureId) {
        // Fetch all project pages, pick ones linked to this feature, prefer one that already has tokens.
        const allPages = await this.api.get<any[]>('/pages', { projectId: this.projectId }).catch(() => [])
        const linkedToFeature = (allPages || []).filter((p: any) =>
          (p.features || []).some((f: any) => f.id === this.scopeFeatureId)
        )
        reloadedPage = linkedToFeature.find((p: any) => p.tokens) || null
      }

      if (reloadedPage?.tokens) {
        this.tokens = reloadedPage.tokens
        this.rawHtml = renderTokens(this.tokens!, this.designSystem, this.protoContext)
        const fullHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>body{margin:0;font-family:'Inter',system-ui,sans-serif}</style></head><body>${this.rawHtml}</body></html>`
        this.safeHtml = this.sanitizer.bypassSecurityTrustResourceUrl('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml))
        this.cdr.detectChanges()
      }

      // Also refresh feature details card if in feature scope (FCS / doc sections may have changed)
      if (this.scopeFeatureId) {
        try {
          const full = await this.api.get<any>(`/features/${this.scopeFeatureId}`)
          this.detailsFeature = full
          this.cdr.detectChanges()
        } catch {}
      }
    } catch {} finally {
      this.reprocessing.set(false)
      this.reprocessStep.set('')
    }
  }

  // Details tab helpers
  detailsFcsScore(f: any): number { return Math.round((f.confidence_score?.overall ?? 0) * 100) }
  detailsFcsColor(score: number): string {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 50) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }
  detailsBarColor(score: number): string {
    if (score >= 80) return 'bg-green-500'
    if (score >= 50) return 'bg-amber-400'
    return 'bg-red-500'
  }
  detailsSections(aiDesc: string): { title: string; content: SafeHtml }[] {
    if (!aiDesc) return []
    return aiDesc.split(/^## /m).filter(Boolean).map(part => {
      const nl = part.indexOf('\n')
      const title = nl === -1 ? part.trim() : part.slice(0, nl).trim()
      const raw = nl === -1 ? '' : part.slice(nl + 1).trim()
      return { title, content: this.sanitizer.bypassSecurityTrustHtml(this.mdToHtml(raw)) }
    })
  }

  private mdToHtml(src: string): string {
    const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
    const inline = (s: string) => esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">$1</code>')

    const lines = src.split('\n')
    const out: string[] = []
    let i = 0
    while (i < lines.length) {
      const line = lines[i]

      // Table: a pipe row followed by a separator row of dashes
      const pipeTable = /^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?\s*$/.test(lines[i + 1])
      // Fallback: tab/multi-space separated table (AI sometimes emits this instead of pipes)
      const looseTableHeader = !pipeTable
        && /^[A-Z][A-Za-z ]{1,30}(\s{2,}|\t)[A-Z][A-Za-z \/]{1,30}/.test(line)
        && i + 1 < lines.length
        && !/^##\s/.test(lines[i + 1])
        && /(\s{2,}|\t)/.test(lines[i + 1])
      if (pipeTable || looseTableHeader) {
        const split = (s: string) => pipeTable
          ? s.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
          : s.trim().split(/\s{2,}|\t/).map(c => c.trim()).filter(Boolean)
        const header = split(line)
        i += pipeTable ? 2 : 1
        const rows: string[][] = []
        while (i < lines.length) {
          const l = lines[i]
          if (!l.trim()) break
          if (pipeTable ? !/^\s*\|.*\|\s*$/.test(l) : !/(\s{2,}|\t)/.test(l)) break
          const cells = split(l)
          if (cells.length < 2) break
          rows.push(cells)
          i++
        }
        out.push(
          '<div class="overflow-x-auto my-2"><table class="w-full text-xs border border-gray-200 rounded">' +
          '<thead class="bg-gray-50"><tr>' + header.map(h => `<th class="text-left px-3 py-2 font-semibold text-gray-700 border-b border-gray-200">${inline(h)}</th>`).join('') + '</tr></thead>' +
          '<tbody>' + rows.map(r => '<tr class="border-b border-gray-100">' + r.map(c => `<td class="px-3 py-2 text-gray-700 align-top">${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>'
        )
        continue
      }

      // Bullet list
      if (/^\s*[-*]\s+/.test(line)) {
        const items: string[] = []
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
          i++
        }
        out.push('<ul class="list-disc pl-5 space-y-1 my-1">' + items.map(it => `<li>${inline(it)}</li>`).join('') + '</ul>')
        continue
      }

      // Numbered list (e.g. "1.", "3.1", "3.2.1")
      if (/^\s*\d+(\.\d+)*\.?\s+/.test(line)) {
        const items: string[] = []
        while (i < lines.length && /^\s*\d+(\.\d+)*\.?\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*/, ''))
          i++
        }
        out.push('<div class="space-y-1 my-1">' + items.map(it => `<div>${inline(it)}</div>`).join('') + '</div>')
        continue
      }

      // Blank line → paragraph break
      if (!line.trim()) { out.push(''); i++; continue }

      // Plain text
      out.push(`<p class="my-1">${inline(line)}</p>`)
      i++
    }
    return out.join('\n')
  }
  moduleAvgScore(): number {
    if (!this.moduleFeatures.length) return 0
    const sum = this.moduleFeatures.reduce((a, f) => a + (f.confidence_score?.overall ?? 0), 0)
    return Math.round((sum / this.moduleFeatures.length) * 100)
  }

  // Inline edit for details
  editingField = signal<string>('')
  editFieldValue = ''
  startFieldEdit(field: string, value: string) { this.editingField.set(field); this.editFieldValue = value }
  cancelFieldEdit() { this.editingField.set('') }
  saveFieldEdit(entityType: string, entityId: number, field: string) {
    this.fieldEdited.emit({ entityType, entityId, field, value: this.editFieldValue })
    this.editingField.set('')
  }

  objectKeys(obj: any): string[] { return obj ? Object.keys(obj) : [] }

  get wrapperWidth(): string {
    return { desktop: '100%', tablet: '768px', mobile: '375px' }[this.viewport]
  }
}
