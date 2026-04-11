import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { HttpClient } from '@angular/common/http'
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

  tree:       ModuleNode[] = []
  showImport  = false
  importText  = ''
  parsing     = false
  selectedId: number | null = null

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.fetchTree() }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['approvedVersions'] || changes['projectId']) { this.fetchTree() }
  }

  toggleImport(): void {
    this.showImport = !this.showImport
    if (this.showImport) this.importText = this.treeToText(this.tree)
  }

  onCommitted(text: string): void {
    if (!text.trim()) return
    this.parsing = true
    this.http.post<{ ok: boolean }>(`http://localhost:3000/modules/parse`, {
      text, projectId: this.projectId
    }).subscribe({
      next:  () => { this.parsing = false; this.fetchTree() },
      error: () => { this.parsing = false },
    })
  }

  fetchTree(): void {
    this.http.get<any[]>(`http://localhost:3000/modules/tree?projectId=${this.projectId}`).subscribe({
      next: rows => { this.tree = this.mapNodes(rows) }
    })
  }

  toggle(node: ModuleNode): void { node.expanded = !node.expanded }

  selectModule(node: ModuleNode): void {
    this.selectedId = node.id
    this.moduleSelected.emit(node)
  }

  get approvedCount(): number { return this.approvedVersions.filter(v => v.approved).length }

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
