import { Component, Input, signal, OnInit, HostListener } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ApiService }  from '../../services/api.service'
import { AuthService } from '../../services/auth.service'

interface Member {
  user_id: number
  name: string
  email: string
  role: string
  created_at: string
}

interface PendingInvite {
  email: string
  role: string
  created_at: string
}

@Component({
  selector: 'app-members-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './members-panel.component.html',
})
export class MembersPanelComponent implements OnInit {
  @Input() projectId = ''

  open      = signal(false)
  members   = signal<Member[]>([])
  pending   = signal<PendingInvite[]>([])
  loading   = signal(false)
  addEmail  = ''
  addRole   = 'collaborator'
  addError  = signal('')
  adding    = signal(false)
  isAdmin   = signal(false)

  constructor(private api: ApiService, private auth: AuthService) {}

  async ngOnInit() {
    await this.loadMembers()
  }

  toggle() {
    this.open.update(v => !v)
    if (this.open()) this.loadMembers()
  }

  async loadMembers() {
    this.loading.set(true)
    try {
      const data = await this.api.get<{ members: Member[]; pending: PendingInvite[] }>(`/projects/${this.projectId}/members`)
      this.members.set(data.members)
      this.pending.set(data.pending)
      const me = this.auth.user()
      this.isAdmin.set(data.members.some(m => m.user_id === me?.id && m.role === 'admin'))
    } catch { }
    this.loading.set(false)
  }

  async addMember() {
    if (!this.addEmail.trim()) return
    this.adding.set(true)
    this.addError.set('')
    try {
      await this.api.post(`/projects/${this.projectId}/members`, { email: this.addEmail, role: this.addRole })
      this.addEmail = ''
      this.addRole = 'collaborator'
      await this.loadMembers()
    } catch (e: any) {
      this.addError.set(e?.error?.error || 'Failed to add member')
    }
    this.adding.set(false)
  }

  async changeRole(member: Member, newRole: string) {
    await this.api.patch(`/projects/${this.projectId}/members/${member.user_id}`, { role: newRole })
    await this.loadMembers()
  }

  async removeMember(member: Member) {
    await this.api.delete(`/projects/${this.projectId}/members/${member.user_id}`)
    await this.loadMembers()
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  isMe(member: Member): boolean {
    return member.user_id === this.auth.user()?.id
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.open.set(false) }
}
