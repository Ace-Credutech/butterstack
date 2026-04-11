import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges, ElementRef, ViewChildren, QueryList } from '@angular/core'
import { Subject, Subscription } from 'rxjs'
import { debounceTime, filter } from 'rxjs/operators'

interface ListItem { id: string; name: string; depth: number }

let _uid = 0
const uid = () => String(++_uid)

@Component({
  selector:    'app-module-structure-input',
  standalone:  true,
  templateUrl: './module-structure-input.component.html',
})
export class ModuleStructureInputComponent implements OnChanges, OnDestroy {
  @Input()  value:   string  = ''
  @Input()  parsing: boolean = false
  @Output() committed        = new EventEmitter<string>()

  @ViewChildren('itemInput') inputs!: QueryList<ElementRef<HTMLInputElement>>

  items:   ListItem[] = []
  numbers: string[]   = []

  private commit$ = new Subject<string>()
  private sub: Subscription = this.commit$.pipe(
    debounceTime(600),
    filter(t => t.trim().length > 0)
  ).subscribe(t => this.committed.emit(t))

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) this.fromText(this.value)
  }

  // ── Compute numbered labels ───────────────────────────────────────────────
  private recompute(): void {
    const counters: number[] = []
    this.numbers = this.items.map(item => {
      const d = item.depth
      while (counters.length <= d) counters.push(0)
      counters[d]++
      counters.splice(d + 1)
      return counters.slice(0, d + 1).join('.')
    })
  }

  // ── Keyboard handlers ─────────────────────────────────────────────────────
  onEnter(i: number, e: Event): void {
    (e as KeyboardEvent).preventDefault()
    const newItem: ListItem = { id: uid(), name: '', depth: this.items[i].depth }
    this.items.splice(i + 1, 0, newItem)
    this.recompute()
    this.focusAfter(i + 1)
  }

  onTab(i: number, e: Event): void {
    const ev = e as KeyboardEvent
    ev.preventDefault()
    if (ev.shiftKey) {
      if (this.items[i].depth > 0) { this.items[i].depth--; this.onChange() }
    } else {
      const maxDepth = i > 0 ? this.items[i - 1].depth + 1 : 0
      if (this.items[i].depth < maxDepth) { this.items[i].depth++; this.onChange() }
    }
  }

  onBackspace(i: number, e: Event): void {
    if (this.items[i].name !== '') return
    if (this.items.length === 1) return
    ;(e as KeyboardEvent).preventDefault()
    this.items.splice(i, 1)
    this.recompute()
    this.focusAfter(Math.max(0, i - 1))
  }

  onNameChange(i: number, val: string): void {
    this.items[i].name = val
    this.onChange()
  }

  addRoot(): void {
    this.items.push({ id: uid(), name: '', depth: 0 })
    this.recompute()
    this.focusAfter(this.items.length - 1)
  }

  remove(i: number): void {
    // Also remove children immediately following
    let end = i + 1
    while (end < this.items.length && this.items[end].depth > this.items[i].depth) end++
    this.items.splice(i, end - i)
    if (!this.items.length) this.items.push({ id: uid(), name: '', depth: 0 })
    this.onChange()
  }

  // ── Text ↔ List conversion ────────────────────────────────────────────────
  private fromText(text: string): void {
    const parsed = text.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const m = l.match(/^(\d+(?:\.\d+)*)\s+(.+)/)
        if (m) return { id: uid(), name: m[2].trim(), depth: m[1].split('.').length - 1 }
        return { id: uid(), name: l.replace(/^[-*•]\s*/, ''), depth: 0 }
      })
    this.items   = parsed.length ? parsed : [{ id: uid(), name: '', depth: 0 }]
    this.recompute()
  }

  toText(): string {
    return this.items
      .filter(it => it.name.trim())
      .map((it, i) => `${this.numbers[i]} ${it.name}`)
      .join('\n')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private onChange(): void {
    this.recompute()
    this.commit$.next(this.toText())
  }

  private focusAfter(i: number): void {
    setTimeout(() => this.inputs.get(i)?.nativeElement.focus(), 0)
  }

  ngOnDestroy(): void { this.sub.unsubscribe() }
}
