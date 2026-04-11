import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core'
import { FormsModule }                                        from '@angular/forms'
import { HttpClient }                                         from '@angular/common/http'
import { Subject, debounceTime, distinctUntilChanged, filter } from 'rxjs'
import type { UITokens }                                      from '../../models/ui-tokens.model'

export interface RequirementInput { title: string; description: string }

interface Suggestion { raw_title: string; raw_description: string; clean_prompt: string; sim: number }

const API = 'http://localhost:3000'

@Component({
  selector:    'app-requirement-input',
  standalone:  true,
  imports:     [FormsModule],
  templateUrl: './requirement-input.component.html',
})
export class RequirementInputComponent implements OnDestroy, OnChanges {
  @Input() tokens:              UITokens | null = null
  @Input() cleanPrompt:         string          = ''
  @Input() activeModuleName:    string | null   = null
  @Input() restoredTitle:       string          = ''
  @Input() restoredDescription: string          = ''

  @Output() inputChanged  = new EventEmitter<RequirementInput>()
  @Output() regenerate    = new EventEmitter<{ title: string; description: string; feedback: string }>()
  @Output() textForParse  = new EventEmitter<string>()

  title        = ''
  description  = ''
  feedback     = ''
  wordCount    = 0
  showFeedback = false

  suggestions: Suggestion[]    = []
  showSuggestions              = false
  activeSuggestionField: 'title' | 'desc' | null = null

  private input$   = new Subject<RequirementInput>()
  private suggest$ = new Subject<{ q: string; field: 'title' | 'desc' }>()
  private parse$   = new Subject<string>()

  private inputSub = this.input$
    .pipe(
      debounceTime(1000),
      distinctUntilChanged((a, b) => a.title === b.title && a.description === b.description),
      filter(v => !!v.title.trim() && !!v.description.trim())
    )
    .subscribe(v => this.inputChanged.emit(v))

  private parseSub = this.parse$
    .pipe(
      debounceTime(1200),
      distinctUntilChanged(),
      filter(t => t.trim().length > 3)
    )
    .subscribe(text => this.textForParse.emit(text))

  private suggestSub = this.suggest$
    .pipe(debounceTime(300), distinctUntilChanged((a, b) => a.q === b.q))
    .subscribe(({ q, field }) => {
      if (q.length < 2) { this.suggestions = []; return }
      this.http.get<{ suggestions: Suggestion[] }>(`${API}/suggestions?q=${encodeURIComponent(q)}`).subscribe({
        next: r => {
          this.suggestions = r.suggestions.filter(s => s.raw_title !== this.title || s.raw_description !== this.description)
          this.showSuggestions = this.suggestions.length > 0
          this.activeSuggestionField = field
        }
      })
    })

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    // When parent restores a version or page loads history → fill in the fields
    if (changes['restoredTitle'] && this.restoredTitle) {
      this.title = this.restoredTitle
    }
    if (changes['restoredDescription'] && this.restoredDescription) {
      this.description = this.restoredDescription
      this.wordCount   = this.description.trim().split(/\s+/).filter(Boolean).length
    }
  }

  onInput(): void {
    this.wordCount = this.description.trim().split(/\s+/).filter(Boolean).length
    this.input$.next({ title: this.title, description: this.description })
    const text = [this.title, this.description].filter(Boolean).join('\n')
    if (text.trim()) this.parse$.next(text)
  }

  onTitleInput(): void {
    this.onInput()
    this.suggest$.next({ q: this.title, field: 'title' })
  }

  onDescInput(): void {
    this.onInput()
    if (this.description.length > 3) this.suggest$.next({ q: this.description.slice(0, 80), field: 'desc' })
  }

  applySuggestion(s: Suggestion): void {
    const original = { title: this.title, description: this.description }
    this.title       = s.raw_title || this.title
    this.description = s.raw_description || this.description
    this.closeSuggestions()
    this.onInput()

    // Learn: user picked a different pattern
    if (original.title !== this.title || original.description !== this.description) {
      this.http.post(`${API}/suggestions/learn`, {
        original, chosen: { title: this.title, description: this.description }, context: 'suggestion_picked'
      }).subscribe()
    }
  }

  closeSuggestions(): void { this.showSuggestions = false; this.suggestions = [] }

  onRegenerate(): void {
    if (!this.title.trim() || !this.description.trim()) return
    this.regenerate.emit({ title: this.title, description: this.description, feedback: this.feedback })
    this.feedback     = ''
    this.showFeedback = false
  }

  ngOnDestroy(): void { this.inputSub.unsubscribe(); this.suggestSub.unsubscribe(); this.parseSub.unsubscribe() }
}
