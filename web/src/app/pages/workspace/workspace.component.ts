import { Component, OnInit, ViewChild, signal } from '@angular/core'
import { Router, ActivatedRoute }  from '@angular/router'
import { PrototypeService }        from '../../services/prototype.service'
import { ApiService }              from '../../services/api.service'
import { RequirementInputComponent, RequirementSaved } from '../../components/requirement-input/requirement-input.component'
import { PrototypePreviewComponent }  from '../../components/prototype-preview/prototype-preview.component'
import { VersionTimelineComponent }   from '../../components/version-timeline/version-timeline.component'
import { ModulesPanelComponent, ModuleNode } from '../../components/modules-panel/modules-panel.component'
import type { UITokens, VersionEntry } from '../../models/ui-tokens.model'

@Component({
  selector:    'app-workspace',
  standalone:  true,
  imports:     [RequirementInputComponent, PrototypePreviewComponent, VersionTimelineComponent, ModulesPanelComponent],
  templateUrl: './workspace.component.html',
})
export class WorkspaceComponent implements OnInit {
  @ViewChild(ModulesPanelComponent) modulesPanel!: ModulesPanelComponent

  projectId   = ''
  projectName = signal('')
  tokens      = signal<UITokens | null>(null)
  cleanPrompt = signal('')
  loading     = signal(false)
  source      = signal('')
  restoredTitle       = signal('')
  restoredDescription = signal('')
  versions    = signal<VersionEntry[]>([])
  meetingActive = signal(false)
  meetingTime   = signal('00:00')
  appFullscreen = signal(false)

  activeModule: ModuleNode | null = null
  private versionCounter = 0
  private meetingStart   = 0
  private meetingInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private route:     ActivatedRoute,
    private router:    Router,
    private prototype: PrototypeService,
    private api:       ApiService,
  ) {}

  async ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? 'default'

    const project = await this.api.get<any>(`/projects/${this.projectId}`)
    this.projectName.set(project.name)

    const { history } = await this.api.get<{ history: any[] }>('/history', { projectId: this.projectId, limit: '50' })
    if (!history.length) return
    const versions = history.map((h, i) => ({
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
    this.versions.set(versions)
    this.versionCounter = versions[0]?.id ?? 0
    const latest = versions[0]
    if (latest) {
      this.tokens.set(latest.tokens)
      this.cleanPrompt.set(latest.cleanPrompt)
      this.source.set(latest.source)
      this.restoredTitle.set(latest.rawTitle)
      this.restoredDescription.set(latest.rawDescription)
    }
  }

  onRequirementSaved({ tokens, cleanPrompt, moduleId, moduleName }: RequirementSaved): void {
    this.tokens.set(tokens)
    this.cleanPrompt.set(cleanPrompt)
    this.source.set('requirement')
    this.saveVersion(moduleName ?? cleanPrompt.slice(0, 60), tokens, 'requirement', cleanPrompt, '')
  }

  async onRegenerate({ title, description, feedback }: { title: string; description: string; feedback: string }): Promise<void> {
    this.loading.set(true)
    try {
      const res = await this.prototype.regenerate(title, description, feedback)
      this.tokens.set(res.tokens)
      this.cleanPrompt.set(res.cleanPrompt)
      this.source.set('regenerated')
      await this.saveVersion(`[Regen] ${title}`, res.tokens, 'openai', title, description)
    } finally {
      this.loading.set(false)
    }
  }

  onModuleSelected(node: ModuleNode) {
    this.activeModule = node
    if (node.tokens) {
      this.tokens.set(node.tokens)
      this.cleanPrompt.set(node.cleanPrompt ?? '')
      this.source.set(`module: ${node.name}`)
      this.restoredTitle.set(node.rawTitle ?? '')
      this.restoredDescription.set(node.rawDescription ?? '')
    }
  }

  onRestoreVersion(v: VersionEntry) {
    this.tokens.set(v.tokens)
    this.cleanPrompt.set(v.cleanPrompt)
    this.source.set(`restored v${v.id}`)
    this.restoredTitle.set(v.rawTitle)
    this.restoredDescription.set(v.rawDescription)
  }

  async onApproveVersion(v: VersionEntry) {
    const approvedAt  = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const isApproving = !v.approved
    this.versions.update(vers => vers.map(ver =>
      ver.id === v.id ? { ...ver, approved: isApproving, approvedAt: isApproving ? approvedAt : undefined } : ver
    ))
    if (v.dbId) await this.api.patch(`/history/${v.dbId}/approve`, { approved: isApproving })
    if (isApproving) {
      const res = await this.prototype.autoAssign(v.tokens, v.label, v.cleanPrompt, this.projectId)
      this.versions.update(vers => vers.map(ver => ver.id === v.id ? { ...ver, modulePath: res.modulePath } : ver))
    }
  }

  toggleAppFullscreen() {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); this.appFullscreen.set(true) }
    else { document.exitFullscreen(); this.appFullscreen.set(false) }
  }

  goToProjects() { this.router.navigate(['/projects']) }

  onToggleMeeting() {
    this.meetingActive.update(v => !v)
    if (this.meetingActive()) {
      this.meetingStart    = Date.now()
      this.meetingInterval = setInterval(() => {
        const s = Math.floor((Date.now() - this.meetingStart) / 1000)
        this.meetingTime.set(`${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`)
      }, 1000)
    } else {
      if (this.meetingInterval) clearInterval(this.meetingInterval)
      this.meetingTime.set('00:00')
    }
  }

  private async saveVersion(label: string, tokens: UITokens, source: string, rawTitle = '', rawDescription = '') {
    this.versionCounter++
    const time  = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const entry: VersionEntry = {
      id: this.versionCounter, label, time, tokens,
      cleanPrompt: this.cleanPrompt(), source, rawTitle, rawDescription,
    }
    this.versions.update(v => [entry, ...v].slice(0, 50))
    const res = await this.api.post<{ id: number }>('/history', {
      label, rawTitle, rawDescription,
      cleanPrompt: this.cleanPrompt(),
      tokens, source,
      projectId: this.projectId,
      moduleId:  this.activeModule?.id ?? null,
    })
    this.versions.update(v => v.map(ver => ver.id === entry.id ? { ...ver, dbId: res.id } : ver))
  }
}
