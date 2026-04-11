import { Component, ChangeDetectorRef, OnInit } from '@angular/core'
import { HttpClient }                    from '@angular/common/http'
import { PrototypeService }              from './services/prototype.service'
import { RequirementInputComponent, RequirementInput } from './components/requirement-input/requirement-input.component'
import { PrototypePreviewComponent }     from './components/prototype-preview/prototype-preview.component'
import { VersionTimelineComponent }      from './components/version-timeline/version-timeline.component'
import { ModulesPanelComponent, ModuleNode } from './components/modules-panel/modules-panel.component'
import type { UITokens, VersionEntry }   from './models/ui-tokens.model'

const API = 'http://localhost:3000'

@Component({
  selector:    'app-root',
  standalone:  true,
  imports:     [RequirementInputComponent, PrototypePreviewComponent, VersionTimelineComponent, ModulesPanelComponent],
  templateUrl: './app.html',
})
export class App implements OnInit {
  tokens:        UITokens | null = null
  cleanPrompt    = ''
  loading        = false
  source         = ''
  versions:      VersionEntry[]  = []
  versionCounter = 0
  meetingActive  = false
  meetingTime    = '00:00'

  // Active module — when set, requirement panel is bound to this module
  activeModule:  ModuleNode | null = null

  private meetingStart    = 0
  private meetingInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private prototype: PrototypeService,
    private http:      HttpClient,
    private cdr:       ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.http.get<{ history: any[] }>(`${API}/history?limit=50`).subscribe({
      next: ({ history }) => {
        if (!history.length) return

        this.versions = history.map((h, i) => ({
          id:          history.length - i,           // descending so newest = highest
          dbId:        h.id,
          label:       h.label,
          time:        new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tokens:      h.tokens,
          cleanPrompt: h.clean_prompt ?? '',
          source:      h.source ?? '',
          approved:    h.approved,
          approvedAt:  h.approved_at ?? undefined,
          modulePath:  h.module_path ?? undefined,
        }))

        this.versionCounter = this.versions[0]?.id ?? 0

        // Restore last prototype state
        const latest = this.versions[0]
        if (latest) {
          this.tokens      = latest.tokens
          this.cleanPrompt = latest.cleanPrompt
          this.source      = latest.source
        }

        this.cdr.detectChanges()
      }
    })
  }

  // Free-form input OR module-bound input (when activeModule is set)
  onInputChanged({ title, description }: RequirementInput): void {
    this.loading = true

    if (this.activeModule) {
      // Module-bound: save to module, generate docs for it
      this.http.post<any>(`${API}/modules/${this.activeModule.id}/content`, { title, description }).subscribe({
        next: res => {
          this.tokens      = res.tokens
          this.cleanPrompt = res.cleanPrompt
          this.source      = res.source
          this.loading     = false
          this.activeModule = { ...this.activeModule!, rawTitle: title, rawDescription: description, cleanPrompt: res.cleanPrompt, tokens: res.tokens }
          this.saveVersion(title, res.tokens, res.source)
          this.cdr.detectChanges()
        },
        error: () => { this.loading = false; this.cdr.detectChanges() }
      })
    } else {
      // Free-form: existing generate flow
      this.prototype.generate(title, description).subscribe({
        next:  res => {
          this.tokens      = res.tokens
          this.cleanPrompt = res.cleanPrompt
          this.source      = res.cached ? 'cache' : 'openai'
          this.loading     = false
          this.saveVersion(title, res.tokens, res.source)
          this.cdr.detectChanges()
        },
        error: () => { this.loading = false; this.cdr.detectChanges() },
      })
    }
  }

  onRegenerate({ title, description, feedback }: { title: string; description: string; feedback: string }): void {
    this.loading = true
    this.prototype.regenerate(title, description, feedback).subscribe({
      next:  res => {
        this.tokens      = res.tokens
        this.cleanPrompt = res.cleanPrompt
        this.source      = 'regenerated'
        this.loading     = false
        this.saveVersion(`[Regen] ${title}`, res.tokens, 'openai')
        this.cdr.detectChanges()
      },
      error: () => { this.loading = false; this.cdr.detectChanges() },
    })
  }

  onModuleSelected(node: ModuleNode): void {
    this.activeModule = node
    // Load module's stored tokens into preview if it has content
    if (node.tokens) {
      this.tokens      = node.tokens
      this.cleanPrompt = node.cleanPrompt ?? ''
      this.source      = `module: ${node.name}`
    }
    this.cdr.detectChanges()
  }

  onRestoreVersion(v: VersionEntry): void {
    this.tokens      = v.tokens
    this.cleanPrompt = v.cleanPrompt
    this.source      = `restored v${v.id}`
    this.cdr.detectChanges()
  }

  onApproveVersion(v: VersionEntry): void {
    const approvedAt  = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const isApproving = !v.approved

    this.versions = this.versions.map(ver =>
      ver.id === v.id
        ? { ...ver, approved: isApproving, approvedAt: isApproving ? approvedAt : undefined }
        : ver
    )
    this.cdr.detectChanges()

    // Persist approval to DB
    if (v.dbId) {
      this.http.patch(`${API}/history/${v.dbId}/approve`, { approved: isApproving }).subscribe()
    }

    if (isApproving) {
      this.prototype.autoAssign(v.tokens, v.label, v.cleanPrompt).subscribe({
        next: res => {
          this.versions = this.versions.map(ver =>
            ver.id === v.id ? { ...ver, modulePath: res.modulePath } : ver
          )
          this.cdr.detectChanges()
        }
      })
    }
  }

  onToggleMeeting(): void {
    this.meetingActive = !this.meetingActive
    if (this.meetingActive) {
      this.meetingStart    = Date.now()
      this.meetingInterval = setInterval(() => {
        const s = Math.floor((Date.now() - this.meetingStart) / 1000)
        this.meetingTime = `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
      }, 1000)
    } else {
      if (this.meetingInterval) clearInterval(this.meetingInterval)
      this.meetingTime = '00:00'
    }
  }

  private saveVersion(label: string, tokens: UITokens, source: string): void {
    this.versionCounter++
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const entry: VersionEntry = {
      id: this.versionCounter, label, time, tokens,
      cleanPrompt: this.cleanPrompt, source,
    }
    this.versions = [entry, ...this.versions].slice(0, 50)

    // Persist to DB
    this.http.post<{ id: number }>(`${API}/history`, {
      label,
      rawTitle:       label,
      cleanPrompt:    this.cleanPrompt,
      tokens,
      source,
      moduleId:       this.activeModule?.id ?? null,
    }).subscribe({
      next: res => {
        // Attach dbId so approve/unapprove can reference it
        this.versions = this.versions.map(v => v.id === entry.id ? { ...v, dbId: res.id } : v)
      }
    })
  }
}
