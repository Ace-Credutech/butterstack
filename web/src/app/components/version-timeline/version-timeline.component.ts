import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import type { VersionEntry } from '../../models/ui-tokens.model'

type Tab = 'history' | 'modules'

interface ModuleNode {
  id:       number
  name:     string
  path:     string
  depth:    number
  children: ModuleNode[]
  versions: VersionEntry[]
  expanded: boolean
}

@Component({
  selector:    'app-version-timeline',
  standalone:  true,
  imports:     [NgTemplateOutlet],
  templateUrl: './version-timeline.component.html',
})
export class VersionTimelineComponent implements OnChanges {
  @Input()  versions: VersionEntry[] = []
  @Input()  meetingActive = false
  @Input()  meetingTime   = '00:00'
  @Output() restore        = new EventEmitter<VersionEntry>()
  @Output() approve        = new EventEmitter<VersionEntry>()
  @Output() toggleMeeting  = new EventEmitter<void>()

  tab: Tab = 'history'
  tree: ModuleNode[] = []

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['versions']) this.rebuildTree()
  }

  switchTab(t: Tab): void {
    this.tab = t
    if (t === 'modules') this.fetchTree()
  }

  fetchTree(): void {
    this.http.get<any[]>('http://localhost:3000/modules/tree').subscribe({
      next: rows => {
        this.tree = this.attachVersions(rows)
      }
    })
  }

  toggle(node: ModuleNode): void { node.expanded = !node.expanded }

  // Attach approved versions to their module nodes by matching modulePath
  private attachVersions(nodes: any[]): ModuleNode[] {
    const approved = this.versions.filter(v => v.approved && v.modulePath?.length)
    return nodes.map(n => this.mapNode(n, approved))
  }

  private mapNode(raw: any, approved: VersionEntry[]): ModuleNode {
    const node: ModuleNode = {
      id:       raw.id,
      name:     raw.name,
      path:     raw.path,
      depth:    raw.depth,
      children: (raw.children ?? []).map((c: any) => this.mapNode(c, approved)),
      versions: approved.filter(v => v.modulePath!.join('/').toLowerCase().replace(/\s+/g, '-') === raw.path),
      expanded: true,
    }
    return node
  }

  private rebuildTree(): void {
    if (this.tab === 'modules') this.fetchTree()
  }

  get approvedCount(): number { return this.versions.filter(v => v.approved).length }
}
