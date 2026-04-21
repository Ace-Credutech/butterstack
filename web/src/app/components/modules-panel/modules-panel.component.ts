import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { ApiService }       from '../../services/api.service'
import { ModuleStructureInputComponent } from '../module-structure-input/module-structure-input.component'
import type { VersionEntry } from '../../models/ui-tokens.model'

export interface FeatureNode {
  id: number; name: string; status: string; moduleName?: string; moduleId?: number
  rawDescription?: string; aiDescription?: string
}

export interface PageNode {
  id: number; name: string; pageType: string; status: string; expanded?: boolean
  tokens?: any
  features: { id: number; name: string; moduleName: string }[]
}

export interface ModuleNode {
  id: number; name: string; path: string; depth: number
  children: ModuleNode[]; versions: VersionEntry[]; expanded: boolean
  features: FeatureNode[]
  rawTitle?: string; rawDescription?: string; cleanPrompt?: string; tokens?: any
}

@Component({
  selector: 'app-modules-panel',
  standalone: true,
  imports: [NgTemplateOutlet, ModuleStructureInputComponent],
  templateUrl: './modules-panel.component.html',
})
export class ModulesPanelComponent implements OnInit, OnChanges {
  @Input() approvedVersions: VersionEntry[] = []
  @Input() projectId: string = 'default'
  @Input() projectName: string = ''
  @Output() restore         = new EventEmitter<VersionEntry>()
  @Output() moduleSelected  = new EventEmitter<ModuleNode>()
  @Output() featureSelected = new EventEmitter<FeatureNode>()
  @Output() pageSelected    = new EventEmitter<PageNode>()
  @Output() projectSelected = new EventEmitter<void>()

  activeTab  = signal<'modules' | 'pages'>('modules')
  tree       = signal<ModuleNode[]>([])
  pages      = signal<PageNode[]>([])
  showImport = signal(false)
  importText = signal('')
  parsing    = signal(false)
  selectedId = signal<number | null>(null)
  selectedFeatureId = signal<number | null>(null)
  selectedPageId    = signal<number | null>(null)
  projectNodeSelected = signal(false)

  constructor(private api: ApiService) {}

  private initialized = false

  ngOnInit() {
    if (!this.initialized) { this.fetchTree(); this.fetchPages() }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['approvedVersions'] && !changes['approvedVersions'].firstChange) { this.fetchTree() }
  }

  loadFromInit(modules: any[], features: any[], pages: any[], pageFeatures: any[]) {
    this.initialized = true
    this.tree.set(this.mapNodes(this.buildTreeFromFlat(modules), features))

    const linksByPage: Record<number, any[]> = {}
    for (const pf of pageFeatures) {
      if (!linksByPage[pf.page_id]) linksByPage[pf.page_id] = []
      linksByPage[pf.page_id].push({ id: pf.id, name: pf.name, moduleName: pf.module_name })
    }

    this.pages.set(pages.map(r => ({
      id: r.id, name: r.name, pageType: r.page_type || 'page', status: r.status,
      tokens: r.tokens, features: linksByPage[r.id] || [],
    })))
  }

  private buildTreeFromFlat(rows: any[]): any[] {
    const map: Record<number, any> = {}
    const roots: any[] = []
    for (const r of rows) { map[r.id] = { ...r, children: [] } }
    for (const r of rows) {
      if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r.id])
      else roots.push(map[r.id])
    }
    return roots
  }

  toggleImport() {
    this.showImport.update(v => !v)
    if (this.showImport()) this.importText.set(this.treeToText(this.tree()))
  }

  async onCommitted(text: string) {
    if (!text.trim()) return
    this.parsing.set(true)
    try {
      await this.api.post('/modules/parse', { text, projectId: this.projectId })
      await this.fetchTree()
    } finally {
      this.parsing.set(false)
    }
  }

  async fetchTree() {
    const rows = await this.api.get<any[]>('/modules/tree', { projectId: this.projectId })
    const features = await this.api.get<any[]>('/features', { projectId: this.projectId })
    this.tree.set(this.mapNodes(rows, features))
  }

  async fetchPages() {
    const rows = await this.api.get<any[]>('/pages', { projectId: this.projectId })
    this.pages.set(rows.map(r => ({
      id: r.id, name: r.name, pageType: r.page_type || 'page', status: r.status,
      tokens: r.tokens, features: r.features || [],
    })))
  }

  toggle(node: ModuleNode) { node.expanded = !node.expanded }
  togglePage(page: PageNode) { page.expanded = !page.expanded }

  selectProject() {
    this.projectNodeSelected.set(true)
    this.selectedId.set(null)
    this.selectedFeatureId.set(null)
    this.selectedPageId.set(null)
    this.projectSelected.emit()
  }

  selectModule(node: ModuleNode) {
    this.projectNodeSelected.set(false)
    this.selectedId.set(node.id)
    this.selectedFeatureId.set(null)
    this.selectedPageId.set(null)
    this.moduleSelected.emit(node)
  }

  selectFeature(feat: FeatureNode) {
    this.selectedFeatureId.set(feat.id)
    this.selectedId.set(null)
    this.selectedPageId.set(null)
    this.featureSelected.emit(feat)
  }

  selectPage(page: PageNode) {
    this.selectedPageId.set(page.id)
    this.selectedId.set(null)
    this.selectedFeatureId.set(null)
    this.pageSelected.emit(page)
  }

  refresh() { this.fetchTree(); this.fetchPages() }

  get approvedCount() { return this.approvedVersions.filter(v => v.approved).length }

  private treeToText(nodes: ModuleNode[], prefix = ''): string {
    return nodes.map((n, i) => {
      const num      = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
      const children = this.treeToText(n.children, num)
      return children ? `${num} ${n.name}\n${children}` : `${num} ${n.name}`
    }).join('\n')
  }

  private mapNodes(nodes: any[], allFeatures: any[] = []): ModuleNode[] {
    return nodes.map(n => ({
      id: n.id, name: n.name, path: n.path, depth: n.depth,
      expanded: true,
      rawTitle:       n.raw_title,
      rawDescription: n.raw_description,
      cleanPrompt:    n.clean_prompt,
      tokens:         n.tokens,
      features: allFeatures.filter(f => f.module_id === n.id).map(f => ({
        id: f.id, name: f.name, status: f.status,
        rawDescription: f.raw_description, aiDescription: f.ai_description,
      })),
      children: this.mapNodes(n.children ?? [], allFeatures),
      versions: this.approvedVersions.filter(v =>
        v.approved && v.modulePath?.join('/').toLowerCase().replace(/\s+/g, '-') === n.path
      )
    }))
  }
}
