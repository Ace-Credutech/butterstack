import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ApiService }       from '../../services/api.service'
import { ModuleStructureInputComponent } from '../module-structure-input/module-structure-input.component'
import type { VersionEntry } from '../../models/ui-tokens.model'

export interface FeatureNode {
  id: number; name: string; status: string; moduleName?: string; moduleId?: number
  rawDescription?: string; aiDescription?: string
  confidenceScore?: any; summary?: string
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
  imports: [NgTemplateOutlet, ModuleStructureInputComponent, FormsModule],
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

  async deleteFeature(feat: FeatureNode, ev: Event) {
    ev.stopPropagation()
    if (!confirm(`Delete feature "${feat.name}"? This removes its documentation and any page links. This cannot be undone.`)) return
    try {
      await this.api.delete(`/features/${feat.id}`)
      if (this.selectedFeatureId() === feat.id) this.selectedFeatureId.set(null)
      this.refresh()
    } catch {
      alert('Delete failed — please try again.')
    }
  }

  async deletePage(page: PageNode, ev: Event) {
    ev.stopPropagation()
    if (!confirm(`Delete page "${page.name}"? This removes its prototype and feature links. This cannot be undone.`)) return
    try {
      await this.api.delete(`/pages/${page.id}`)
      if (this.selectedPageId() === page.id) this.selectedPageId.set(null)
      this.refresh()
    } catch {
      alert('Delete failed — please try again.')
    }
  }

  async deleteModule(node: ModuleNode, ev: Event) {
    ev.stopPropagation()
    const childCount = (node.children?.length || 0) + (node.features?.length || 0)
    const warn = childCount > 0
      ? `Delete module "${node.name}" and ALL its ${childCount} child(ren)? This removes nested sub-modules and features too. Cannot be undone.`
      : `Delete module "${node.name}"? Cannot be undone.`
    if (!confirm(warn)) return
    try {
      await this.api.delete(`/modules/${node.id}`)
      if (this.selectedId() === node.id) this.selectedId.set(null)
      this.refresh()
    } catch {
      alert('Delete failed — please try again.')
    }
  }

  findModuleById(id: number): ModuleNode | null {
    const walk = (nodes: ModuleNode[]): ModuleNode | null => {
      for (const n of nodes) {
        if (n.id === id) return n
        const c = walk(n.children || [])
        if (c) return c
      }
      return null
    }
    return walk(this.tree())
  }

  findFeatureById(id: number): FeatureNode | null {
    const walk = (nodes: ModuleNode[]): FeatureNode | null => {
      for (const n of nodes) {
        const f = (n.features || []).find(x => x.id === id)
        if (f) return f
        const c = walk(n.children || [])
        if (c) return c
      }
      return null
    }
    return walk(this.tree())
  }

  findPageById(id: number): PageNode | null {
    return this.pages().find(p => p.id === id) || null
  }

  // Node creation
  creatingNode = signal(false)
  newNodeName = ''
  newNodeParentId: number | null = null
  newNodeType: 'module' | 'page' | 'feature' = 'module'

  startCreateNode(type: 'module' | 'page' | 'feature', parentId: number | null = null) {
    this.newNodeType = type
    this.newNodeParentId = parentId
    this.newNodeName = ''
    this.creatingNode.set(true)
  }

  async confirmCreateNode() {
    if (!this.newNodeName.trim()) { this.creatingNode.set(false); return }
    if (this.newNodeType === 'module') {
      await this.api.post('/modules', { name: this.newNodeName, projectId: this.projectId, parentId: this.newNodeParentId })
    } else if (this.newNodeType === 'page') {
      await this.api.post('/pages', { name: this.newNodeName, projectId: this.projectId, pageType: 'form' })
    } else if (this.newNodeType === 'feature') {
      if (!this.newNodeParentId) return
      await this.api.post('/features', { name: this.newNodeName, projectId: this.projectId, moduleId: this.newNodeParentId })
    }
    this.creatingNode.set(false)
    this.refresh()
  }

  cancelCreateNode() { this.creatingNode.set(false) }

  onCreateKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') this.confirmCreateNode()
    if (e.key === 'Escape') this.cancelCreateNode()
  }

  fcsScore(feat: FeatureNode): number {
    return Math.round((feat.confidenceScore?.overall ?? 0) * 100)
  }

  fcsColor(score: number): string {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 50) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  fcsDotColor(val: number): string {
    if (val >= 0.8) return 'bg-green-400'
    if (val >= 0.5) return 'bg-amber-400'
    return 'bg-red-400'
  }

  moduleRedFlagCount(node: ModuleNode): number {
    let count = 0
    for (const f of node.features) { if (this.fcsScore(f) < 50) count++ }
    for (const child of node.children) { count += this.moduleRedFlagCount(child) }
    return count
  }

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
        confidenceScore: f.confidence_score, summary: f.summary,
      })),
      children: this.mapNodes(n.children ?? [], allFeatures),
      versions: this.approvedVersions.filter(v =>
        v.approved && v.modulePath?.join('/').toLowerCase().replace(/\s+/g, '-') === n.path
      )
    }))
  }
}
