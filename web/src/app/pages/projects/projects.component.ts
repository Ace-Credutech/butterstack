import { Component, OnInit, ChangeDetectorRef } from '@angular/core'
import { Router }             from '@angular/router'
import { HttpClient }         from '@angular/common/http'
import { FormsModule }        from '@angular/forms'

interface Project { id: number; name: string; slug: string; description: string; status: string; created_at: string; updated_at: string }

const API = 'http://localhost:3000'

@Component({
  selector:    'app-projects',
  standalone:  true,
  imports:     [FormsModule],
  templateUrl: './projects.component.html',
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = []
  showCreate  = false
  newName     = ''
  newDesc     = ''
  creating    = false

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.load() }

  load(): void {
    this.http.get<Project[]>(`${API}/projects`).subscribe({ next: p => { this.projects = p; this.cdr.detectChanges() } })
  }

  open(p: Project): void { this.router.navigate(['/projects', p.id]) }

  create(): void {
    if (!this.newName.trim()) return
    this.creating = true
    this.http.post<Project>(`${API}/projects`, { name: this.newName, description: this.newDesc }).subscribe({
      next: p => { this.router.navigate(['/projects', p.id]) },
      error: () => { this.creating = false }
    })
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
