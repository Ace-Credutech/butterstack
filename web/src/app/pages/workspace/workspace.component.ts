import { Component, OnInit, AfterViewInit, ViewChild, signal, HostListener } from '@angular/core'
import { Router, ActivatedRoute }  from '@angular/router'
import { PrototypeService }        from '../../services/prototype.service'
import { ApiService }              from '../../services/api.service'
import { PrototypePreviewComponent }  from '../../components/prototype-preview/prototype-preview.component'
import { VersionTimelineComponent }   from '../../components/version-timeline/version-timeline.component'
import { ModulesPanelComponent, ModuleNode, FeatureNode, PageNode } from '../../components/modules-panel/modules-panel.component'
import { UserAvatarComponent } from '../../components/user-avatar/user-avatar.component'
import { MembersPanelComponent } from '../../components/members-panel/members-panel.component'
import { ExportService } from '../../services/export.service'
import { ElicitationChatComponent } from '../../components/elicitation-chat/elicitation-chat.component'
import { DesignSettingsComponent } from '../../components/design-settings/design-settings.component'
import { QuizModalComponent } from '../../components/quiz-modal/quiz-modal.component'
import { UsagePanelComponent } from '../../components/usage-panel/usage-panel.component'
import type { UITokens, VersionEntry } from '../../models/ui-tokens.model'

@Component({
  selector:    'app-workspace',
  standalone:  true,
  imports:     [PrototypePreviewComponent, VersionTimelineComponent, ModulesPanelComponent, UserAvatarComponent, MembersPanelComponent, ElicitationChatComponent, DesignSettingsComponent, UsagePanelComponent, QuizModalComponent],
  templateUrl: './workspace.component.html',
})
export class WorkspaceComponent implements OnInit, AfterViewInit {
  @ViewChild(ModulesPanelComponent) modulesPanel!: ModulesPanelComponent
  @ViewChild(ElicitationChatComponent) chatPanel!: ElicitationChatComponent
  @ViewChild(PrototypePreviewComponent) protoPanel!: PrototypePreviewComponent
  @ViewChild(QuizModalComponent) quizModal!: QuizModalComponent

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
  relatedPages  = signal<{ id: number; name: string; pageType: string; tokens?: any }[]>([])
  selectedContext = signal('')
  scopeModuleId  = signal<number | null>(null)
  scopePageId    = signal<number | null>(null)
  scopeFeatureId = signal<number | null>(null)

  detailsModule  = signal<any>(null)
  detailsFeature = signal<any>(null)
  moduleFeatures = signal<any[]>([])

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

  async ngAfterViewInit() {
    if (this._initData && this.modulesPanel) {
      this.modulesPanel.loadFromInit(
        this._initData.modules, this._initData.features,
        this._initData.pages, this._initData.pageFeatures
      )
    }
    await this.applyUrlState()
  }

async onModuleSelected(node: ModuleNode) {
    this.activeModule = node
    this.source.set(`module: ${node.name}`)
    this.selectedContext.set(node.name)
    this.scopeModuleId.set(node.id)
    this.scopePageId.set(null)
    this.scopeFeatureId.set(null)

    // Set details data and switch to Details tab
    this.detailsModule.set({ name: node.name, id: node.id })
    this.detailsFeature.set(null)
    // Fetch all features for this module (sorted by FCS ascending)
    const feats = await this.api.get<any[]>('/features', { moduleId: String(node.id) })
    this.moduleFeatures.set(feats.sort((a, b) => (a.confidence_score?.overall ?? 0) - (b.confidence_score?.overall ?? 0)))
    this.protoPanel?.setTab('details', false)
    this.syncUrl()

    const allFeatureIds = this.collectFeatureIds(node)
    if (allFeatureIds.length) {
      await this.showRelatedPages(allFeatureIds)
    } else {
      this.relatedPages.set([])
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
  goToConfidence() { this.router.navigate(['/projects', this.projectId, 'confidence']) }

  async onDetailsFeatureClicked(featureId: number) {
    const full = await this.api.get<any>(`/features/${featureId}`)
    this.detailsFeature.set(full)
    this.detailsModule.set(null)
  }

  startQuiz(featureId: number, featureName: string, currentFcs: number) {
    this.quizModal?.start(featureId, featureName, currentFcs)
  }

  onQuizScoreUpdated(newScore: any) {
    const feat = this.detailsFeature()
    if (feat) this.detailsFeature.set({ ...feat, confidence_score: newScore })
  }

  onQuizClosed() {
    // Refresh feature data
    const feat = this.detailsFeature()
    if (feat?.id) this.onDetailsFeatureClicked(feat.id)
  }

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

    // Set details data and switch to Details tab
    this.detailsFeature.set(full)
    this.detailsModule.set(null)
    this.protoPanel?.setTab('details', false)
    this.syncUrl()

    await this.showRelatedPages([feat.id])
  }

  async onPageSelected(page: PageNode) {
    this.source.set(`page: ${page.name}`)
    this.relatedPages.set([])
    this.scopePageId.set(page.id)
    this.scopeModuleId.set(null)
    this.scopeFeatureId.set(null)
    this.detailsModule.set(null)
    this.detailsFeature.set(null)
    const full = await this.api.get<any>(`/pages/${page.id}`)
    if (full.tokens) this.tokens.set(full.tokens)
    this.protoPanel?.setTab('prototype', false)
    this.syncUrl()
  }

  onTabChanged(tab: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
  }

  private syncUrl() {
    const qp: any = {
      moduleId: this.scopeModuleId() ?? null,
      featureId: this.scopeFeatureId() ?? null,
      pageId: this.scopePageId() ?? null,
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
  }

  private async applyUrlState() {
    const qp = this.route.snapshot.queryParamMap
    const moduleId = qp.get('moduleId')
    const featureId = qp.get('featureId')
    const pageId = qp.get('pageId')
    const tab = qp.get('tab') as any

    if (pageId && this.modulesPanel) {
      const pageNode = this.modulesPanel.findPageById(Number(pageId))
      if (pageNode) await this.onPageSelected(pageNode)
    } else if (featureId && this.modulesPanel) {
      const featNode = this.modulesPanel.findFeatureById(Number(featureId))
      if (featNode) await this.onFeatureSelected(featNode)
    } else if (moduleId && this.modulesPanel) {
      const modNode = this.modulesPanel.findModuleById(Number(moduleId))
      if (modNode) await this.onModuleSelected(modNode)
    }
    if (tab) this.protoPanel?.setTab(tab, false)
  }

  @HostListener('window:message', ['$event'])
  async onWindowMessage(ev: MessageEvent) {
    const d = ev.data
    if (!d || d.type !== 'prototype-nav' || !d.targetType) return
    const allPages = await this.api.get<any[]>('/pages', { projectId: this.projectId })
    const target = allPages.find(p => p.page_type === d.targetType && p.tokens)
    if (!target) return
    const node = this.modulesPanel?.findPageById(target.id)
    if (node) {
      await this.onPageSelected(node)
      this.protoPanel?.setTab('prototype', false)
      this.syncUrl()
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

}
