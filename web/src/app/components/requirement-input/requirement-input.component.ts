import { Component, Output, EventEmitter, OnDestroy } from '@angular/core'
import { FormsModule }                                from '@angular/forms'
import { Subject, debounceTime, distinctUntilChanged, filter } from 'rxjs'

export interface RequirementInput { title: string; description: string }

@Component({
  selector:    'app-requirement-input',
  standalone:  true,
  imports:     [FormsModule],
  templateUrl: './requirement-input.component.html',
})
export class RequirementInputComponent implements OnDestroy {
  @Output() inputChanged = new EventEmitter<RequirementInput>()
  @Output() regenerate   = new EventEmitter<{ title: string; description: string; feedback: string }>()

  title       = ''
  description = ''
  feedback    = ''
  wordCount   = 0
  showFeedback = false

  private input$ = new Subject<RequirementInput>()
  private sub    = this.input$
    .pipe(
      debounceTime(1000),
      distinctUntilChanged((a, b) => a.title === b.title && a.description === b.description),
      filter(v => !!v.title.trim() && !!v.description.trim())
    )
    .subscribe(v => this.inputChanged.emit(v))

  onInput(): void {
    this.wordCount = this.description.trim().split(/\s+/).filter(Boolean).length
    this.input$.next({ title: this.title, description: this.description })
  }

  onRegenerate(): void {
    if (!this.title.trim() || !this.description.trim()) return
    this.regenerate.emit({ title: this.title, description: this.description, feedback: this.feedback })
    this.feedback    = ''
    this.showFeedback = false
  }

  ngOnDestroy(): void { this.sub.unsubscribe() }
}
