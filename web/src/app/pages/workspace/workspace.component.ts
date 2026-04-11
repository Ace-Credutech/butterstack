import { Component, ChangeDetectorRef, OnInit, ViewChild } from '@angular/core'
import { Router, ActivatedRoute }                from '@angular/router'
import { HttpClient }                            from '@angular/common/http'
import { PrototypeService }                      from '../../services/prototype.service'
import { RequirementInputComponent, RequirementInput } from '../../components/requirement-input/requirement-input.component'
import { PrototypePreviewComponent }             from '../../components/prototype-preview/prototype-preview.component'
import { VersionTimelineComponent }              from '../../components/version-timeline/version-timeline.component'
import { ModulesPanelComponent, ModuleNode }     from '../../components/modules-panel/modules-panel.component'
import type { UITokens, VersionEntry }           from '../../models/ui-tokens.model'

const API = 'http://localhost:3000'

@Component({
  selector:    'app-workspace',
  standalone:  true,
  imports:     [RequirementInputComponent, PrototypePreviewComponent, VersionTimelineComponent, ModulesPanelComponent],
  templateUrl: './workspace.component.html',
})
export class WorkspaceComponent implements OnInit {
  @ViewChild(ModulesPanelComponent) modulesPanel!: ModulesPanelComponent
  projectId   = ''
  projectName = ''

  tokens:        UITokens | null = null
  cleanPrompt    = ''
  loading        = false
  source         = ''
  restoredTitle       = ''
  restoredDescription = ''

  versions:      VersionEntry[]  = []
  versionCounter = 0
  meetingActive  = false
  meetingTime    = '00:00'
  activeModule:  ModuleNode | null = null
  appFullscreen  = false

  private meetingStart    = 0
  private meetingInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private route:     ActivatedRoute,
    private router:    Router,
    private prototype: PrototypeService,
    private http:      HttpClient,
    private cdr:       ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? 'default'

    // Load project name
    this.http.get<any>(`${API}/projects/${this.projectId}`).subscribe({
      next: p => { this.projectName = p.name; this.cdr.detectChanges() }
    })

    // Load history
    this.http.get<{ history: any[] }>(`${API}/history?projectId=${this.projectId}&limit=50`).subscribe({
      next: ({ history }) => {
        if (!history.length) return
        this.versions = history.map((h, i) => ({
          id:             history.length - i,
          dbId:           h.id,
          label:          h.label,
          time:           new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tokens:         h.tokens,
          cleanPrompt:    h.clean_prompt ?? '',
          rawTitle:       h.raw_title ?? '',
          rawDescription: h.raw_description ?? '',
          source:         h.source ?? '',
          approved:       h.approved,
          approvedAt:     h.approved_at ?? undefined,
          modulePath:     h.module_path ?? undefined,
        }))
        this.versionCounter = this.versions[0]?.id ?? 0
        const latest = this.versions[0]
        if (latest) {
          this.tokens              = latest.tokens
          this.cleanPrompt         = latest.cleanPrompt
          this.source              = latest.source
          this.restoredTitle       = latest.rawTitle
          this.restoredDescription = latest.rawDescription
        }
        this.cdr.detectChanges()
      }
    })
  }

  onInputChanged({ title, description }: RequirementInput): void {
    this.loading = true
    if (this.activeModule) {
      this.http.post<any>(`${API}/modules/${this.activeModule.id}/content`, { title, description }).subscribe({
        next: res => {
          this.tokens       = res.tokens
          this.cleanPrompt  = res.cleanPrompt
          this.source       = res.source
          this.loading      = false
          this.activeModule = { ...this.activeModule!, rawTitle: title, rawDescription: description, cleanPrompt: res.cleanPrompt, tokens: res.tokens }
          this.saveVersion(title, res.tokens, res.source, title, description)
          this.cdr.detectChanges()
        },
        error: () => { this.loading = false; this.cdr.detectChanges() }
      })
    } else {
      this.prototype.generate(title, description).subscribe({
        next:  res => {
          this.tokens      = res.tokens
          this.cleanPrompt = res.cleanPrompt
          this.source      = res.cached ? 'cache' : 'openai'
          this.loading     = false
          this.saveVersion(title, res.tokens, res.source, title, description)
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
        this.saveVersion(`[Regen] ${title}`, res.tokens, 'openai', title, description)
        this.cdr.detectChanges()
      },
      error: () => { this.loading = false; this.cdr.detectChanges() },
    })
  }

  onTextForParse(text: string): void {
    this.http.post(`${API}/modules/parse`, { text, projectId: this.projectId }).subscribe({
      next: () => this.modulesPanel?.fetchTree()
    })
  }

  onModuleSelected(node: ModuleNode): void {
    this.activeModule = node
    if (node.tokens) {
      this.tokens              = node.tokens
      this.cleanPrompt         = node.cleanPrompt ?? ''
      this.source              = `module: ${node.name}`
      this.restoredTitle       = node.rawTitle ?? ''
      this.restoredDescription = node.rawDescription ?? ''
    }
    this.cdr.detectChanges()
  }

  onRestoreVersion(v: VersionEntry): void {
    this.tokens              = v.tokens
    this.cleanPrompt         = v.cleanPrompt
    this.source              = `restored v${v.id}`
    this.restoredTitle       = v.rawTitle
    this.restoredDescription = v.rawDescription
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
    if (v.dbId) {
      this.http.patch(`${API}/history/${v.dbId}/approve`, { approved: isApproving }).subscribe()
    }
    if (isApproving) {
      this.prototype.autoAssign(v.tokens, v.label, v.cleanPrompt, this.projectId).subscribe({
        next: res => {
          this.versions = this.versions.map(ver =>
            ver.id === v.id ? { ...ver, modulePath: res.modulePath } : ver
          )
          this.cdr.detectChanges()
        }
      })
    }
  }

  toggleAppFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      this.appFullscreen = true
    } else {
      document.exitFullscreen()
      this.appFullscreen = false
    }
  }

  goToProjects(): void { this.router.navigate(['/projects']) }

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

  private saveVersion(label: string, tokens: UITokens, source: string, rawTitle = '', rawDescription = ''): void {
    this.versionCounter++
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const entry: VersionEntry = {
      id: this.versionCounter, label, time, tokens,
      cleanPrompt: this.cleanPrompt, source, rawTitle, rawDescription,
    }
    this.versions = [entry, ...this.versions].slice(0, 50)
    this.http.post<{ id: number }>(`${API}/history`, {
      label, rawTitle, rawDescription,
      cleanPrompt: this.cleanPrompt,
      tokens, source,
      projectId:   this.projectId,
      moduleId:    this.activeModule?.id ?? null,
    }).subscribe({
      next: res => {
        this.versions = this.versions.map(v => v.id === entry.id ? { ...v, dbId: res.id } : v)
      }
    })
  }
}
