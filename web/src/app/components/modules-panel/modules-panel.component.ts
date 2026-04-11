import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import type { VersionEntry } from '../../models/ui-tokens.model'

interface ModuleNode {
  id: number; name: string; path: string; depth: number
  children: ModuleNode[]; versions: VersionEntry[]; expanded: boolean
}

@Component({
  selector: 'app-modules-panel',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './modules-panel.component.html',
})
export class ModulesPanelComponent implements OnInit, OnChanges {
  @Input() approvedVersions: VersionEntry[] = []
  @Output() restore = new EventEmitter<VersionEntry>()
  tree: ModuleNode[] = []

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.fetchTree() }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['approvedVersions']) { this.fetchTree() }
  }

  fetchTree(): void {
    this.http.get<any[]>('http://localhost:3000/modules/tree').subscribe({
      next: rows => { this.tree = this.mapNodes(rows) }
    })
  }

  toggle(node: ModuleNode): void { node.expanded = !node.expanded }

  get approvedCount(): number { return this.approvedVersions.filter(v => v.approved).length }

  private mapNodes(nodes: any[]): ModuleNode[] {
    return nodes.map(n => ({
      id: n.id, name: n.name, path: n.path, depth: n.depth,
      expanded: true,
      children: this.mapNodes(n.children ?? []),
      versions: this.approvedVersions.filter(v =>
        v.approved && v.modulePath?.join('/').toLowerCase().replace(/\s+/g, '-') === n.path
      )
    }))
  }
}
