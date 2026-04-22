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
  pmStatus?: string
  summary?: string
  confidenceScore?: { documentation: number; elicitationDepth: number; assumptionRisk: number; stability: number; prototypeValidation: number; overall: number }
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

  // Feedback
  myRating     = signal<string>('')
  feedbackText = ''

  // Image
  pendingImages = signal<{ base64: string; preview: string }[]>([])
  dragOver = signal(false)

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
    const images = this.pendingImages()
    if (!text && !selected && !images.length) return

    this.sending.set(true)
    this.inputText = ''
    const sentImages = [...images]
    this.pendingImages.set([])

    if (!this.sessionId) {
      const session = await this.elicitation.createSession(this.projectId)
      this.sessionId = session.id
    }

    const displayContent = text || (Array.isArray(selected) ? selected.join(', ') : selected!)
    this.messages.update(m => [...m, { role: 'user', content: displayContent, type: 'text', images: sentImages.map(i => i.preview) } as any])
    this.shouldScroll = true

    try {
      const response = await this.elicitation.sendMessage(
        this.sessionId, text, 'text', selected,
        sentImages.length ? sentImages.map(i => i.base64) : undefined
      )
      this.messages.update(m => [...m, {
        role: 'assistant', content: response.content, type: response.type,
        options: response.options, breakdown: (response as any).breakdown,
      }])
      // If a new breakdown proposal arrives (even after a completed session was reactivated), re-enable the Confirm/Adjust buttons
      if (response.type === 'breakdown_proposal') this.completed.set(false)
      this.shouldScroll = true
    } catch {
      this.messages.update(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.', type: 'text' }])
    }

    this.sending.set(false)
    setTimeout(() => this.chatInput?.nativeElement?.focus())
  }

  selectOption(optionId: string, optionLabel: string) { this.send(optionLabel, optionId) }

  // ── Bullet extraction & selection (for assistant messages that list proposals) ──
  bulletSelected = signal<Record<number, Set<number>>>({})
  questionAnswers = signal<Record<number, Record<number, string>>>({})

  bulletsAreQuestions(bullets: string[]): boolean {
    if (!bullets.length) return false
    const q = bullets.filter(b => /\?\s*$/.test(b.trim())).length
    return q / bullets.length >= 0.6
  }

  getAnswer(msgIdx: number, qIdx: number): string {
    return this.questionAnswers()[msgIdx]?.[qIdx] ?? ''
  }

  setAnswer(msgIdx: number, qIdx: number, value: string) {
    const current = { ...this.questionAnswers() }
    current[msgIdx] = { ...(current[msgIdx] || {}), [qIdx]: value }
    this.questionAnswers.set(current)
  }

  hasAnyAnswer(msgIdx: number): boolean {
    const map = this.questionAnswers()[msgIdx]
    if (!map) return false
    return Object.values(map).some(v => v.trim().length > 0)
  }

  sendAnswers(msgIdx: number, bullets: string[]) {
    const map = this.questionAnswers()[msgIdx] || {}
    const parts: string[] = []
    bullets.forEach((q, i) => {
      const a = (map[i] || '').trim()
      if (a) parts.push(`Q: ${q}\nA: ${a}`)
    })
    if (!parts.length) return
    const current = { ...this.questionAnswers() }
    delete current[msgIdx]
    this.questionAnswers.set(current)
    this.send(parts.join('\n\n'))
  }

  parseBullets(content: string): { intro: string; bullets: string[]; outro: string } {
    if (!content) return { intro: '', bullets: [], outro: '' }
    const lines = content.split('\n')
    const intro: string[] = []
    const bullets: string[] = []
    const outro: string[] = []
    let phase: 'intro' | 'bullets' | 'outro' = 'intro'
    for (const line of lines) {
      const bm = line.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)$/)
      if (bm) {
        if (phase === 'outro') { // bullets resumed — merge outro back
          bullets.push(...outro.filter(l => /^\s*(?:[-•*]|\d+\.)\s+/.test(l)).map(l => l.replace(/^\s*(?:[-•*]|\d+\.)\s+/, '')))
          outro.length = 0
        }
        bullets.push(bm[1].trim())
        phase = 'bullets'
      } else if (phase === 'bullets' && line.trim()) {
        outro.push(line)
        phase = 'outro'
      } else if (phase === 'intro') {
        intro.push(line)
      } else if (phase === 'outro') {
        outro.push(line)
      }
    }
    return { intro: intro.join('\n').trim(), bullets, outro: outro.join('\n').trim() }
  }

  isBulletSelected(msgIdx: number, bulletIdx: number): boolean {
    return this.bulletSelected()[msgIdx]?.has(bulletIdx) ?? false
  }

  toggleBullet(msgIdx: number, bulletIdx: number) {
    const current = { ...this.bulletSelected() }
    const set = new Set(current[msgIdx] || [])
    if (set.has(bulletIdx)) set.delete(bulletIdx); else set.add(bulletIdx)
    current[msgIdx] = set
    this.bulletSelected.set(current)
  }

  includeSelectedBullets(msgIdx: number, bullets: string[]) {
    const sel = this.bulletSelected()[msgIdx]
    if (!sel || !sel.size) return
    const picked = Array.from(sel).sort((a, b) => a - b).map(i => bullets[i]).filter(Boolean)
    const current = { ...this.bulletSelected() }
    delete current[msgIdx]
    this.bulletSelected.set(current)
    this.send(`Include: ${picked.map(p => `"${p}"`).join('; ')}`)
  }

  includeAllBullets(msgIdx: number, bullets: string[]) {
    // Tick every checkbox first so the user sees the selection land, then send.
    const current = { ...this.bulletSelected() }
    current[msgIdx] = new Set(bullets.map((_, i) => i))
    this.bulletSelected.set(current)
    setTimeout(() => {
      const cleared = { ...this.bulletSelected() }
      delete cleared[msgIdx]
      this.bulletSelected.set(cleared)
      this.send(`Include all of it: ${bullets.map(p => `"${p}"`).join('; ')}`)
    }, 250)
  }

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
      const result: any = await this.elicitation.completeSession(this.sessionId)
      this.completed.set(true)
      const c = result.created || { modules: 0, features: 0, pages: 0 }
      const cn = result.createdNames || { features: [], pages: [] }
      const u = result.updated || { features: 0, pages: 0, featureNames: [], pageNames: [] }
      const parts: string[] = []
      const createdNames = [...(cn.features || []), ...(cn.pages || [])]
      if (createdNames.length) {
        parts.push(`Created: ${createdNames.join(', ')}`)
      } else if (c.modules) {
        parts.push(`Created ${c.modules} module(s)`)
      }
      const updatedNames = [...(u.featureNames || []), ...(u.pageNames || [])]
      if (updatedNames.length) {
        parts.push(`Updating: ${updatedNames.join(', ')} — docs + prototype regenerating in background (10-20s)`)
      }
      if (!parts.length) parts.push("I couldn't propose a structure from that. Try giving it more detail — e.g., the domain (school, healthcare, e-commerce), key user roles, or specific flows you want built.")
      const summary = parts.join(' · ')

      // Insert a live-updating status message if a background job is running
      if (result.jobId) {
        this.messages.update(m => [...m, {
          role: 'assistant',
          content: `${summary}\n\n⏳ Regenerating: queued...`,
          type: 'job_status',
          jobId: result.jobId,
        } as any])
        this.pollJob(result.jobId, summary)
      } else {
        this.messages.update(m => [...m, { role: 'assistant', content: summary, type: 'confirmation' }])
      }
      this.sessionCompleted.emit(result.created)
    } catch {
      this.messages.update(m => [...m, { role: 'assistant', content: 'Failed to create structure. Please try again.', type: 'text' }])
    }
    this.sending.set(false)
  }

  private async pollJob(jobId: number, summaryPrefix: string) {
    const deadline = Date.now() + 180_000
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1500))
      let job: any
      try { job = await this.api.get<any>(`/reprocess/status/${jobId}`) } catch { break }
      const icon = job.status === 'done' ? '✓' : job.status === 'failed' ? '✗' : '⏳'
      const label = job.status === 'done'
        ? 'Done — docs + prototypes updated'
        : job.status === 'failed'
          ? `Failed${job.error ? ': ' + String(job.error).slice(0, 120) : ''}`
          : `Regenerating: ${job.step || job.status}...`
      this.messages.update(m => m.map(msg =>
        (msg as any).jobId === jobId
          ? { ...msg, content: `${summaryPrefix}\n\n${icon} ${label}` }
          : msg
      ))
      if (job.status === 'done' || job.status === 'failed') {
        if (job.status === 'done') this.sessionCompleted.emit({ modules: 0, features: 0, pages: 0 } as any)
        break
      }
    }
  }

  editingBreakdownIdx = signal<number | null>(null)
  savingBreakdown = signal(false)

  adjustBreakdown(msgIdx: number) { this.editingBreakdownIdx.set(msgIdx) }
  cancelAdjust() { this.editingBreakdownIdx.set(null) }

  renameModule(msgIdx: number, modIdx: number, value: string) {
    this.messages.update(m => {
      const copy = [...m]; const msg: any = { ...copy[msgIdx] }
      msg.breakdown = structuredClone(msg.breakdown)
      msg.breakdown.modules[modIdx].name = value
      copy[msgIdx] = msg; return copy
    })
  }
  renameSub(msgIdx: number, modIdx: number, subIdx: number, value: string) {
    this.messages.update(m => {
      const copy = [...m]; const msg: any = { ...copy[msgIdx] }
      msg.breakdown = structuredClone(msg.breakdown)
      msg.breakdown.modules[modIdx].subModules[subIdx].name = value
      copy[msgIdx] = msg; return copy
    })
  }
  renameFeature(msgIdx: number, modIdx: number, subIdx: number, fIdx: number, value: string) {
    this.messages.update(m => {
      const copy = [...m]; const msg: any = { ...copy[msgIdx] }
      msg.breakdown = structuredClone(msg.breakdown)
      msg.breakdown.modules[modIdx].subModules[subIdx].features[fIdx] = value
      copy[msgIdx] = msg; return copy
    })
  }
  removeFeature(msgIdx: number, modIdx: number, subIdx: number, fIdx: number) {
    this.messages.update(m => {
      const copy = [...m]; const msg: any = { ...copy[msgIdx] }
      msg.breakdown = structuredClone(msg.breakdown)
      msg.breakdown.modules[modIdx].subModules[subIdx].features.splice(fIdx, 1)
      copy[msgIdx] = msg; return copy
    })
  }
  addFeature(msgIdx: number, modIdx: number, subIdx: number) {
    const name = prompt('New feature name?')
    if (!name?.trim()) return
    this.messages.update(m => {
      const copy = [...m]; const msg: any = { ...copy[msgIdx] }
      msg.breakdown = structuredClone(msg.breakdown)
      msg.breakdown.modules[modIdx].subModules[subIdx].features.push(name.trim())
      copy[msgIdx] = msg; return copy
    })
  }
  removeSub(msgIdx: number, modIdx: number, subIdx: number) {
    this.messages.update(m => {
      const copy = [...m]; const msg: any = { ...copy[msgIdx] }
      msg.breakdown = structuredClone(msg.breakdown)
      msg.breakdown.modules[modIdx].subModules.splice(subIdx, 1)
      copy[msgIdx] = msg; return copy
    })
  }
  removeModule(msgIdx: number, modIdx: number) {
    this.messages.update(m => {
      const copy = [...m]; const msg: any = { ...copy[msgIdx] }
      msg.breakdown = structuredClone(msg.breakdown)
      msg.breakdown.modules.splice(modIdx, 1)
      copy[msgIdx] = msg; return copy
    })
  }

  async saveBreakdown(msgIdx: number) {
    if (!this.sessionId) return
    const breakdown = (this.messages()[msgIdx] as any).breakdown
    this.savingBreakdown.set(true)
    try {
      await this.api.patch(`/elicitation/sessions/${this.sessionId}/breakdown`, { breakdown })
      this.editingBreakdownIdx.set(null)
    } catch {}
    this.savingBreakdown.set(false)
  }

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

  onPaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) this.addImage(file)
        return
      }
    }
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragOver.set(true) }
  onDragLeave() { this.dragOver.set(false) }

  onDrop(e: DragEvent) {
    e.preventDefault()
    this.dragOver.set(false)
    const files = e.dataTransfer?.files
    if (!files) return
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) this.addImage(files[i])
    }
  }

  private addImage(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      this.pendingImages.update(imgs => [...imgs, { base64, preview: base64 }])
    }
    reader.readAsDataURL(file)
  }

  removeImage(index: number) {
    this.pendingImages.update(imgs => imgs.filter((_, i) => i !== index))
  }

  // ── Documentation view ────────────────────────────────────

  showDoc(entity: DocEntity) {
    this.docEntity.set(entity)
    this.editingDoc.set(false)
    this.docTab.set('docs')
    this.myRating.set('')
    this.feedbackText = ''
    this.mode.set('doc')
    this.loadComments()
    this.loadFeedback()
  }

  async loadFeedback() {
    const e = this.docEntity()
    if (!e) return
    try {
      const list = await this.api.get<any[]>('/feedback', { entityType: e.kind, entityId: String(e.id) })
      const mine = list.find((f: any) => true)
      if (mine) this.myRating.set(mine.rating)
    } catch {}
  }

  hasVagueLanguage(): boolean {
    const desc = this.docEntity()?.aiDescription || ''
    return /\b(TBD|as needed|to be decided|appropriate|relevant|suitable)\b/i.test(desc)
  }

  pmStatuses = ['not_started', 'in_progress', 'review', 'done']

  async updatePmStatus(status: string) {
    const e = this.docEntity()
    if (!e) return
    const endpoint = e.kind === 'feature' ? '/features' : e.kind === 'page' ? '/pages' : '/modules'
    await this.api.patch(`${endpoint}/${e.id}`, { pmStatus: status })
    this.docEntity.set({ ...e, pmStatus: status })
  }

  pmStatusLabel(s: string): string {
    return { not_started: 'Not Started', in_progress: 'In Progress', review: 'Review', done: 'Done' }[s] || s
  }

  pmStatusColor(s: string): string {
    return { not_started: 'bg-gray-100 text-gray-500', in_progress: 'bg-blue-50 text-blue-600', review: 'bg-amber-50 text-amber-600', done: 'bg-green-50 text-green-600' }[s] || 'bg-gray-100 text-gray-500'
  }

  async submitFeedback(rating: string) {
    const e = this.docEntity()
    if (!e) return
    this.myRating.set(rating)
    await this.api.post('/feedback', { projectId: this.projectId, entityType: e.kind, entityId: e.id, rating, content: this.feedbackText || null })
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
    this.api.post(`/reprocess/${e.kind}/${e.id}`, { rawDescription: this.editRaw }).catch(() => {})

    this.docEntity.set({ ...e, rawDescription: this.editRaw, aiDescription: this.editAi })
    this.editingDoc.set(false)
    this.savingDoc.set(false)
  }

  // Auto-save on blur for inline editing
  private autoSaveTimer: any = null
  onDocFieldBlur() {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer)
    this.autoSaveTimer = setTimeout(() => this.saveDoc(), 500)
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
