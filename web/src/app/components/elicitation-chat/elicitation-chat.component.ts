import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ElicitationService, type ChatMessage, type ElicitationSession } from '../../services/elicitation.service'
import { ApiService } from '../../services/api.service'

export interface DocEntity {
  id: number
  kind: 'feature' | 'page' | 'module'
  name: string
  rawDescription?: string
  aiDescription?: string
  status?: string
  summary?: string
  confidenceScore?: { completeness: number; stability: number; intentFidelity: number }
  testCases?: string
  useCases?: string
}

export interface Comment {
  id: number
  user_name: string
  content: string
  resolved: boolean
  created_at: string
}

@Component({
  selector: 'app-elicitation-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './elicitation-chat.component.html',
})
export class ElicitationChatComponent implements OnInit, AfterViewChecked {
  @Input() projectId = ''
  @Output() sessionCompleted = new EventEmitter<{ modules: number; features: number; pages: number }>()
  @ViewChild('scrollArea') scrollArea!: ElementRef<HTMLDivElement>
  @ViewChild('chatInput') chatInput!: ElementRef<HTMLTextAreaElement>

  mode = signal<'sessions' | 'chat' | 'doc'>('sessions')

  // Sessions list
  sessions = signal<ElicitationSession[]>([])
  loadingSessions = signal(false)

  // Chat
  sessionId: number | null = null
  messages  = signal<ChatMessage[]>([])
  inputText = ''
  sending   = signal(false)
  completed = signal(false)
  multiSelected = signal<string[]>([])
  private shouldScroll = false

  // Documentation
  docEntity = signal<DocEntity | null>(null)
  docTab    = signal<'docs' | 'tests' | 'comments'>('docs')
  editingDoc = signal(false)
  editRaw = ''
  editAi  = ''
  savingDoc = signal(false)

  // Comments
  comments     = signal<Comment[]>([])
  newComment   = ''
  addingComment = signal(false)

  constructor(private elicitation: ElicitationService, private api: ApiService) {}

  async ngOnInit() {
    await this.loadSessions()
  }

  // ── Sessions ─────────────────────────────────────────────

  async loadSessions() {
    this.loadingSessions.set(true)
    this.sessions.set(await this.elicitation.listSessions(this.projectId))
    this.loadingSessions.set(false)
  }

  async openSession(session: ElicitationSession) {
    this.mode.set('chat')
    this.sessionId = session.id
    this.completed.set(false)

    const data = await this.elicitation.getSession(session.id)
    this.messages.set((data.messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
      type: m.message_type,
      options: m.options,
      breakdown: m.metadata?.breakdown,
    })))
    this.shouldScroll = true
  }

  startNewChat() {
    this.sessionId = null
    this.messages.set([])
    this.completed.set(false)
    this.inputText = ''
    this.mode.set('chat')
  }

  backToSessions() {
    this.mode.set('sessions')
    this.loadSessions()
  }

  // ── Chat ──────────────────────────────────────────────────

  async send(content?: string, selected?: string | string[]) {
    const text = content ?? this.inputText.trim()
    if (!text && !selected) return

    this.sending.set(true)
    this.inputText = ''

    if (!this.sessionId) {
      const session = await this.elicitation.createSession(this.projectId)
      this.sessionId = session.id
    }

    this.messages.update(m => [...m, { role: 'user', content: text || (Array.isArray(selected) ? selected.join(', ') : selected!), type: 'text' }])
    this.shouldScroll = true

    try {
      const response = await this.elicitation.sendMessage(this.sessionId, text, 'text', selected)
      this.messages.update(m => [...m, {
        role: 'assistant', content: response.content, type: response.type,
        options: response.options, breakdown: (response as any).breakdown,
      }])
      this.shouldScroll = true
    } catch {
      this.messages.update(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.', type: 'text' }])
    }

    this.sending.set(false)
    setTimeout(() => this.chatInput?.nativeElement?.focus())
  }

  selectOption(optionId: string, optionLabel: string) { this.send(optionLabel, optionId) }

  toggleMultiOption(optionId: string) {
    this.multiSelected.update(s => s.includes(optionId) ? s.filter(x => x !== optionId) : [...s, optionId])
  }

  submitMulti(options: { id: string; label: string }[]) {
    const selected = this.multiSelected()
    const labels = options.filter(o => selected.includes(o.id)).map(o => o.label)
    this.multiSelected.set([])
    this.send(labels.join(', '), selected)
  }

  async confirmBreakdown() {
    if (!this.sessionId) return
    this.sending.set(true)
    try {
      const result = await this.elicitation.completeSession(this.sessionId)
      this.completed.set(true)
      this.messages.update(m => [...m, {
        role: 'assistant',
        content: `Structure created: ${result.created.modules} modules, ${result.created.features} features, ${result.created.pages} pages.`,
        type: 'confirmation',
      }])
      this.sessionCompleted.emit(result.created)
    } catch {
      this.messages.update(m => [...m, { role: 'assistant', content: 'Failed to create structure. Please try again.', type: 'text' }])
    }
    this.sending.set(false)
  }

  adjustBreakdown() { this.send('I\'d like to adjust the breakdown. Let me explain what should change.') }

  isLastBreakdown(index: number): boolean {
    const msgs = this.messages()
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].type === 'breakdown_proposal') return i === index
    }
    return false
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send() }
  }

  // ── Documentation view ────────────────────────────────────

  showDoc(entity: DocEntity) {
    this.docEntity.set(entity)
    this.editingDoc.set(false)
    this.docTab.set('docs')
    this.mode.set('doc')
    this.loadComments()
  }

  async loadComments() {
    const e = this.docEntity()
    if (!e) return
    try {
      this.comments.set(await this.api.get<Comment[]>('/comments', { entityType: e.kind, entityId: String(e.id) }))
    } catch { this.comments.set([]) }
  }

  async addComment() {
    const e = this.docEntity()
    if (!e || !this.newComment.trim()) return
    this.addingComment.set(true)
    await this.api.post('/comments', { projectId: this.projectId, entityType: e.kind, entityId: e.id, content: this.newComment })
    this.newComment = ''
    await this.loadComments()
    this.addingComment.set(false)
  }

  async resolveComment(id: number) {
    await this.api.patch(`/comments/${id}/resolve`, {})
    await this.loadComments()
  }

  async deleteComment(id: number) {
    await this.api.delete(`/comments/${id}`)
    await this.loadComments()
  }

  commentTimeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  getConfidenceValue(key: string): number {
    const score = this.docEntity()?.confidenceScore as any
    return score?.[key] ?? 0
  }

  confidenceColor(score: number): string {
    if (score >= 0.7) return 'bg-green-500'
    if (score >= 0.4) return 'bg-amber-400'
    return 'bg-red-400'
  }

  confidencePercent(score: number): string {
    return Math.round(score * 100) + '%'
  }

  startEditDoc() {
    const e = this.docEntity()
    if (!e) return
    this.editRaw = e.rawDescription || ''
    this.editAi  = e.aiDescription || ''
    this.editingDoc.set(true)
  }

  cancelEditDoc() { this.editingDoc.set(false) }

  async saveDoc() {
    const e = this.docEntity()
    if (!e) return
    this.savingDoc.set(true)
    const endpoint = e.kind === 'feature' ? '/features' : e.kind === 'page' ? '/pages' : '/modules'
    await this.api.patch(`${endpoint}/${e.id}`, { rawDescription: this.editRaw, aiDescription: this.editAi })
    this.docEntity.set({ ...e, rawDescription: this.editRaw, aiDescription: this.editAi })
    this.editingDoc.set(false)
    this.savingDoc.set(false)
  }

  backFromDoc() {
    this.docEntity.set(null)
    this.mode.set(this.sessionId ? 'chat' : 'sessions')
  }

  parseDocSections(text: string): { title: string; content: string }[] {
    const sections: { title: string; content: string }[] = []
    const parts = text.split(/^## /m).filter(Boolean)
    for (const part of parts) {
      const newline = part.indexOf('\n')
      if (newline === -1) {
        sections.push({ title: part.trim(), content: '' })
      } else {
        sections.push({ title: part.slice(0, newline).trim(), content: part.slice(newline + 1).trim() })
      }
    }
    if (!sections.length && text.trim()) {
      sections.push({ title: 'Documentation', content: text.trim() })
    }
    return sections
  }

  sessionInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  sessionTimeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight
      this.shouldScroll = false
    }
  }
}
