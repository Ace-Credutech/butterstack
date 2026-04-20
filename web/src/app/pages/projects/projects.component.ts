import { Component, OnInit, signal } from '@angular/core'
import { Router }      from '@angular/router'
import { FormsModule } from '@angular/forms'
import { ApiService }  from '../../services/api.service'
import { UserAvatarComponent } from '../../components/user-avatar/user-avatar.component'

interface Project { id: number; name: string; slug: string; description: string; status: string; created_at: string; updated_at: string }

@Component({
  selector:    'app-projects',
  standalone:  true,
  imports:     [FormsModule, UserAvatarComponent],
  templateUrl: './projects.component.html',
})
export class ProjectsComponent implements OnInit {
  projects  = signal<Project[]>([])
  showCreate = signal(false)
  creating   = signal(false)
  newName    = ''
  newDesc    = ''

  constructor(private api: ApiService, private router: Router) {}

  async ngOnInit() { await this.load() }

  async load() {
    const data = await this.api.get<Project[]>('/projects')
    this.projects.set(data)
  }

  open(p: Project) { this.router.navigate(['/projects', p.id]) }

  async create() {
    if (!this.newName.trim()) return
    this.creating.set(true)
    const p = await this.api.post<Project>('/projects', { name: this.newName, description: this.newDesc })
    this.router.navigate(['/projects', p.id])
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }
}
