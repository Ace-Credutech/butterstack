import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ApiService } from '../../services/api.service'

interface QuizQuestion {
  question: string
  options: { id: string; label: string }[]
  contextKey: string
  confidenceImpact: string
  multiSelect?: boolean
}

@Component({
  selector: 'app-quiz-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './quiz-modal.component.html',
})
export class QuizModalComponent {
  @Input() featureId = 0
  @Input() featureName = ''
  @Output() closed = new EventEmitter<void>()
  @Output() scoreUpdated = new EventEmitter<any>()

  open           = signal(false)
  loading        = signal(false)
  submitting     = signal(false)
  question       = signal<QuizQuestion | null>(null)
  selectedOption = signal<string>('')
  selectedOptions = signal<Set<string>>(new Set())
  customAnswer   = ''
  showCustom     = signal(false)
  currentScore   = signal(0)
  questionCount  = signal(0)
  answeredCount  = signal(0)
  completed      = signal(false)
  previousAnswers: { question: string; answer: string }[] = []

  constructor(private api: ApiService) {}

  async start(featureId: number, featureName: string, currentFcs: number) {
    this.featureId = featureId
    this.featureName = featureName
    this.currentScore.set(currentFcs)
    this.questionCount.set(0)
    this.answeredCount.set(0)
    this.completed.set(false)
    this.previousAnswers = []
    this.open.set(true)
    await this.loadNextQuestion()
  }

  async loadNextQuestion() {
    this.loading.set(true)
    this.selectedOption.set('')
    this.selectedOptions.set(new Set())
    this.customAnswer = ''
    this.showCustom.set(false)
    try {
      const q = await this.api.post<QuizQuestion>(`/quiz/features/${this.featureId}/question`, { previousAnswers: this.previousAnswers })
      this.question.set(q)
      this.questionCount.update(n => n + 1)
    } catch {
      this.question.set(null)
      this.completed.set(true)
    }
    this.loading.set(false)
  }

  selectOption(id: string) {
    const q = this.question()
    if (q?.multiSelect && id !== 'E') {
      const s = new Set(this.selectedOptions())
      if (s.has(id)) s.delete(id); else s.add(id)
      this.selectedOptions.set(s)
      // Keep showCustom open only if E is active
      if (!s.size) this.selectedOption.set('')
      else this.selectedOption.set(Array.from(s).join(','))
    } else {
      this.selectedOption.set(id)
      this.selectedOptions.set(id === 'E' ? new Set() : new Set([id]))
      this.showCustom.set(id === 'E')
    }
  }

  isSelected(id: string): boolean {
    const q = this.question()
    if (q?.multiSelect && id !== 'E') return this.selectedOptions().has(id)
    return this.selectedOption() === id
  }

  async submit() {
    const q = this.question()
    if (!q) return

    let answer: string
    if (q.multiSelect) {
      const ids = Array.from(this.selectedOptions())
      const labels = ids.map(id => q.options.find(o => o.id === id)?.label).filter(Boolean) as string[]
      if (this.showCustom() && this.customAnswer.trim()) labels.push(this.customAnswer.trim())
      if (!labels.length) return
      answer = labels.join('; ')
    } else {
      const selected = this.selectedOption()
      if (!selected) return
      if (selected === 'E') {
        answer = this.customAnswer
        if (!answer.trim()) return
      } else {
        answer = q.options.find(o => o.id === selected)?.label || selected
      }
    }

    this.submitting.set(true)
    try {
      const result = await this.api.post<{ ok: boolean; newScore: any }>(`/quiz/features/${this.featureId}/answer`, {
        question: q.question, answer, contextKey: q.contextKey,
      })
      this.previousAnswers.push({ question: q.question, answer })
      this.answeredCount.update(n => n + 1)
      this.currentScore.set(Math.round((result.newScore.overall ?? 0) * 100))
      this.scoreUpdated.emit(result.newScore)

      if (this.currentScore() >= 100) {
        this.completed.set(true)
      } else {
        await this.loadNextQuestion()
      }
    } catch {}
    this.submitting.set(false)
  }

  async skip() {
    const q = this.question()
    if (!q) return
    await this.api.post(`/quiz/features/${this.featureId}/skip`, { question: q.question })
    this.previousAnswers.push({ question: q.question, answer: '(skipped)' })
    await this.loadNextQuestion()
  }

  close() {
    this.open.set(false)
    this.closed.emit()
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.open()) this.close() }
}
