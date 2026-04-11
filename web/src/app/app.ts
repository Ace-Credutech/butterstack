import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core'
import { PrototypeService }   from './services/prototype.service'
import { RequirementInputComponent, RequirementInput } from './components/requirement-input/requirement-input.component'
import { PrototypePreviewComponent }                   from './components/prototype-preview/prototype-preview.component'
import { VersionTimelineComponent }                    from './components/version-timeline/version-timeline.component'
import { ModulesPanelComponent }                       from './components/modules-panel/modules-panel.component'
import type { UITokens, VersionEntry }                 from './models/ui-tokens.model'

@Component({
  selector:    'app-root',
  standalone:  true,
  imports:     [RequirementInputComponent, PrototypePreviewComponent, VersionTimelineComponent, ModulesPanelComponent],
  templateUrl: './app.html',
})
export class App {
  tokens:        UITokens | null = null
  loading        = false
  source         = ''
  versions:      VersionEntry[]  = []
  versionCounter = 0
  meetingActive  = false
  meetingTime    = '00:00'

  private meetingStart    = 0
  private meetingInterval: ReturnType<typeof setInterval> | null = null

  constructor(private prototype: PrototypeService, private cdr: ChangeDetectorRef) {}

  onInputChanged({ title, description }: RequirementInput): void {
    this.loading = true
    this.prototype.generate(title, description).subscribe({
      next:  res => { this.tokens = res.tokens; this.source = res.cached ? 'cache' : 'openai'; this.loading = false; this.saveVersion(title, res.tokens, res.source); this.cdr.detectChanges() },
      error: ()  => { this.loading = false; this.cdr.detectChanges() },
    })
  }

  onRegenerate({ title, description, feedback }: { title: string; description: string; feedback: string }): void {
    this.loading = true
    this.prototype.regenerate(title, description, feedback).subscribe({
      next:  res => { this.tokens = res.tokens; this.source = 'regenerated'; this.loading = false; this.saveVersion(`[Regen] ${title}`, res.tokens, 'openai'); this.cdr.detectChanges() },
      error: ()  => { this.loading = false; this.cdr.detectChanges() },
    })
  }

  onRestoreVersion(v: VersionEntry): void { this.tokens = v.tokens; this.source = `restored v${v.id}`; this.cdr.detectChanges() }

  onApproveVersion(v: VersionEntry): void {
    const approvedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const isApproving = !v.approved

    this.versions = this.versions.map(ver =>
      ver.id === v.id
        ? { ...ver, approved: isApproving, approvedAt: isApproving ? approvedAt : undefined, modulePath: isApproving ? ver.modulePath : undefined }
        : ver
    )
    this.cdr.detectChanges()

    if (isApproving) {
      this.prototype.autoAssign(v.tokens, v.label, v.cleanPrompt).subscribe({
        next: res => {
          this.versions = this.versions.map(ver =>
            ver.id === v.id ? { ...ver, modulePath: res.modulePath } : ver
          )
          this.cdr.detectChanges()
        }
      })
    }
  }

  onToggleMeeting(): void {
    this.meetingActive = !this.meetingActive
    if (this.meetingActive) {
      this.meetingStart    = Date.now()
      this.meetingInterval = setInterval(() => {
        const s = Math.floor((Date.now() - this.meetingStart) / 1000)
        this.meetingTime = `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
      }, 1000)
    } else {
      if (this.meetingInterval) clearInterval(this.meetingInterval)
      this.meetingTime = '00:00'
    }
  }

  private saveVersion(label: string, tokens: UITokens, source: string): void {
    this.versionCounter++
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    this.versions = [{ id: this.versionCounter, label, time, tokens, cleanPrompt: '', source }, ...this.versions].slice(0, 50)
  }
}
