import { Component, OnInit, AfterViewInit, ViewChild, signal } from '@angular/core'
import { Router, ActivatedRoute }  from '@angular/router'
import { PrototypeService }        from '../../services/prototype.service'
import { ApiService }              from '../../services/api.service'
import { RequirementInputComponent, RequirementSaved } from '../../components/requirement-input/requirement-input.component'
import { PrototypePreviewComponent }  from '../../components/prototype-preview/prototype-preview.component'
import { VersionTimelineComponent }   from '../../components/version-timeline/version-timeline.component'
import { ModulesPanelComponent, ModuleNode, FeatureNode, PageNode } from '../../components/modules-panel/modules-panel.component'
import { UserAvatarComponent } from '../../components/user-avatar/user-avatar.component'
import { MembersPanelComponent } from '../../components/members-panel/members-panel.component'
import { ExportService } from '../../services/export.service'
import { ElicitationChatComponent } from '../../components/elicitation-chat/elicitation-chat.component'
import { DesignSettingsComponent } from '../../components/design-settings/design-settings.component'
import { UsagePanelComponent } from '../../components/usage-panel/usage-panel.component'
import type { UITokens, VersionEntry } from '../../models/ui-tokens.model'

@Component({
  selector:    'app-workspace',
  standalone:  true,
  imports:     [RequirementInputComponent, PrototypePreviewComponent, VersionTimelineComponent, ModulesPanelComponent, UserAvatarComponent, MembersPanelComponent, ElicitationChatComponent, DesignSettingsComponent, UsagePanelComponent],
  templateUrl: './workspace.component.html',
})
export class WorkspaceComponent implements OnInit, AfterViewInit {
  @ViewChild(ModulesPanelComponent) modulesPanel!: ModulesPanelComponent
  @ViewChild(ElicitationChatComponent) chatPanel!: ElicitationChatComponent
  @ViewChild(PrototypePreviewComponent) protoPanel!: PrototypePreviewComponent

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
  inputMode     = signal<'chat' | 'classic'>('chat')
  relatedPages  = signal<{ id: number; name: string; pageType: string; tokens?: any }[]>([])
  selectedContext = signal('')
  scopeModuleId  = signal<number | null>(null)
  scopePageId    = signal<number | null>(null)
  scopeFeatureId = signal<number | null>(null)

  activeModule: ModuleNode | null = null
  private versionCounter = 0
  private meetingStart   = 0
  private meetingInterval: ReturnType<typeof setInterval> | null = null

  showExportMenu = signal(false)

  constructor(
    private route:     ActivatedRoute,
    private router:    Router,
    private prototype: PrototypeService,
    private api:       ApiService,
    public  exportSvc: ExportService,
  ) {}

  async ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? 'default'

    const [project, initData] = await Promise.all([
      this.api.get<any>(`/projects/${this.projectId}`),
      this.api.get<any>('/workspace/init', { projectId: this.projectId }),
    ])

    this.projectName.set(project.name)

    // Pass init data to modules panel (avoids 3 extra API calls)
    if (this.modulesPanel) {
      this.modulesPanel.loadFromInit(initData.modules, initData.features, initData.pages, initData.pageFeatures)
    }
    this._initData = initData

    const history = initData.history || []
    if (!history.length) return
    const versions = history.map((h: any, i: number) => ({
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
  }

  private _initData: any = null

  ngAfterViewInit() {
    if (this._initData && this.modulesPanel) {
      this.modulesPanel.loadFromInit(
        this._initData.modules, this._initData.features,
        this._initData.pages, this._initData.pageFeatures
      )
    }
  }

  onRequirementSaved({ tokens, cleanPrompt, moduleName }: RequirementSaved): void {
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

  async onModuleSelected(node: ModuleNode) {
    this.activeModule = node
    this.source.set(`module: ${node.name}`)
    this.selectedContext.set(node.name)
    this.scopeModuleId.set(node.id)
    this.scopePageId.set(null)
    this.scopeFeatureId.set(null)

    const allFeatureIds = this.collectFeatureIds(node)
    if (allFeatureIds.length) {
      await this.showRelatedPages(allFeatureIds)
    } else if (node.tokens) {
      this.relatedPages.set([])
      this.tokens.set(node.tokens)
      this.cleanPrompt.set(node.cleanPrompt ?? '')
    }
  }

  private collectFeatureIds(node: ModuleNode): number[] {
    const ids = node.features.map(f => f.id)
    for (const child of node.children) {
      ids.push(...this.collectFeatureIds(child))
    }
    return ids
  }

  private async showRelatedPages(featureIds: number[]) {
    const allPages = await this.api.get<any[]>('/pages', { projectId: this.projectId })
    const related = allPages.filter(p =>
      p.features?.some((f: any) => featureIds.includes(f.id))
    ).map(p => ({ id: p.id, name: p.name, pageType: p.page_type || 'page', tokens: p.tokens }))

    if (related.length === 1 && related[0].tokens) {
      this.relatedPages.set([])
      this.tokens.set(related[0].tokens)
    } else if (related.length > 0) {
      this.relatedPages.set(related)
    } else {
      this.relatedPages.set([])
    }
  }

  async selectRelatedPage(page: { id: number; name: string; tokens?: any }) {
    this.relatedPages.set([])
    if (page.tokens) {
      this.tokens.set(page.tokens)
      this.source.set(`page: ${page.name}`)
    } else {
      const full = await this.api.get<any>(`/pages/${page.id}`)
      if (full.tokens) this.tokens.set(full.tokens)
      this.source.set(`page: ${page.name}`)
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

  onDesignSaved() {
    this.protoPanel?.reloadDesignSystem()
  }

  onSessionCompleted(_created: { modules: number; features: number; pages: number }) {
    this.modulesPanel?.refresh()
  }

  async onProjectSelected() {
    this.source.set(`project: ${this.projectName()}`)
    this.selectedContext.set(this.projectName())
    this.scopeModuleId.set(null)
    this.scopePageId.set(null)
    this.scopeFeatureId.set(null)
    const allPages = await this.api.get<any[]>('/pages', { projectId: this.projectId })
    const pagesWithTokens = allPages.filter(p => p.tokens).map(p => ({ id: p.id, name: p.name, pageType: p.page_type || 'page', tokens: p.tokens }))
    if (pagesWithTokens.length === 1) {
      this.relatedPages.set([])
      this.tokens.set(pagesWithTokens[0].tokens)
    } else if (pagesWithTokens.length > 1) {
      this.relatedPages.set(pagesWithTokens)
    } else {
      this.relatedPages.set([])
      this.tokens.set(null)
    }
  }

  async onFeatureSelected(feat: FeatureNode) {
    this.source.set(`feature: ${feat.name}`)
    this.selectedContext.set(feat.name)
    this.scopeFeatureId.set(feat.id)
    this.scopeModuleId.set(null)
    this.scopePageId.set(null)
    const full = await this.api.get<any>(`/features/${feat.id}`)
    if (this.chatPanel) {
      this.chatPanel.showDoc({
        id: feat.id, kind: 'feature', name: feat.name,
        rawDescription: full.raw_description, aiDescription: full.ai_description, status: full.status,
        pmStatus: full.pm_status, summary: full.summary, confidenceScore: full.confidence_score,
        testCases: full.test_cases, useCases: full.use_cases,
      })
    }
    await this.showRelatedPages([feat.id])
  }

  async onPageSelected(page: PageNode) {
    this.source.set(`page: ${page.name}`)
    this.relatedPages.set([])
    this.scopePageId.set(page.id)
    this.scopeModuleId.set(null)
    this.scopeFeatureId.set(null)
    const full = await this.api.get<any>(`/pages/${page.id}`)
    if (full.tokens) this.tokens.set(full.tokens)
    if (this.chatPanel) {
      this.chatPanel.showDoc({
        id: page.id, kind: 'page', name: page.name,
        rawDescription: full.raw_description, aiDescription: full.ai_description, status: full.status,
        pmStatus: full.pm_status, summary: full.summary,
      })
    }
  }

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
