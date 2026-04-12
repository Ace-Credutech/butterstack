import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { ApiService }       from '../../services/api.service'
import { ModuleStructureInputComponent } from '../module-structure-input/module-structure-input.component'
import type { VersionEntry } from '../../models/ui-tokens.model'

export interface ModuleNode {
  id: number; name: string; path: string; depth: number
  children: ModuleNode[]; versions: VersionEntry[]; expanded: boolean
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
  @Output() restore        = new EventEmitter<VersionEntry>()
  @Output() moduleSelected = new EventEmitter<ModuleNode>()

  tree       = signal<ModuleNode[]>([])
  showImport = signal(false)
  importText = signal('')
  parsing    = signal(false)
  selectedId = signal<number | null>(null)

  constructor(private api: ApiService) {}

  ngOnInit() { this.fetchTree() }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['approvedVersions'] || changes['projectId']) this.fetchTree()
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
    this.tree.set(this.mapNodes(rows))
  }

  toggle(node: ModuleNode) { node.expanded = !node.expanded }

  selectModule(node: ModuleNode) {
    this.selectedId.set(node.id)
    this.moduleSelected.emit(node)
  }

  get approvedCount() { return this.approvedVersions.filter(v => v.approved).length }

  private treeToText(nodes: ModuleNode[], prefix = ''): string {
    return nodes.map((n, i) => {
      const num      = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
      const children = this.treeToText(n.children, num)
      return children ? `${num} ${n.name}\n${children}` : `${num} ${n.name}`
    }).join('\n')
  }

  private mapNodes(nodes: any[]): ModuleNode[] {
    return nodes.map(n => ({
      id: n.id, name: n.name, path: n.path, depth: n.depth,
      expanded: true,
      rawTitle:       n.raw_title,
      rawDescription: n.raw_description,
      cleanPrompt:    n.clean_prompt,
      tokens:         n.tokens,
      children: this.mapNodes(n.children ?? []),
      versions: this.approvedVersions.filter(v =>
        v.approved && v.modulePath?.join('/').toLowerCase().replace(/\s+/g, '-') === n.path
      )
    }))
  }
}
