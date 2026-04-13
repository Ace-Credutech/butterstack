import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ApiService } from '../../services/api.service'
import type { UITokens } from '../../models/ui-tokens.model'

interface FlatModule { id: number; name: string; depth: number; path: string }
interface TreeNode { id: number; name: string; depth: number; path: string; children?: TreeNode[] }

export interface RequirementSaved {
  id: number
  tokens: UITokens
  cleanPrompt: string
  moduleId: number | null
  moduleName: string | null
}

@Component({
  selector:    'app-requirement-input',
  standalone:  true,
  imports:     [FormsModule],
  templateUrl: './requirement-input.component.html',
})
export class RequirementInputComponent implements OnChanges {
  @Input() tokens:              UITokens | null = null
  @Input() cleanPrompt:         string          = ''
  @Input() projectId:           string          = 'default'
  @Input() restoredTitle:       string          = ''
  @Input() restoredDescription: string          = ''

  @Output() requirementSaved = new EventEmitter<RequirementSaved>()
  @Output() regenerate       = new EventEmitter<{ title: string; description: string; feedback: string }>()

  // Step 1 — input
  rawText   = ''
  wordCount = 0

  // Flow state
  step: 'input' | 'confirm' | 'select_module' = 'input'

  // Step 2 — confirm
  previewing    = false
  interpretedText = ''

  // Step 3 — module selection
  flatModules:      FlatModule[]  = []
  loadingModules    = false
  selectedModuleId: number | null = null
  selectedModuleName              = ''

  // Save
  saving = false

  // Feedback / regenerate panel
  feedback     = ''
  showFeedback = false

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Restore from version timeline: populate rawText
    if (changes['restoredTitle'] && this.restoredTitle) {
      this.rawText  = this.restoredTitle + (this.restoredDescription ? '\n' + this.restoredDescription : '')
      this.wordCount = this.rawText.trim().split(/\s+/).filter(Boolean).length
      this.step     = 'input'
    }
  }

  onInput(): void {
    this.wordCount = this.rawText.trim().split(/\s+/).filter(Boolean).length
  }

  async onSubmit(): Promise<void> {
    if (!this.rawText.trim()) return
    this.previewing = true
    this.step       = 'confirm'
    try {
      const r = await this.api.post<{ cleanPrompt: string }>('/requirements/preview', { text: this.rawText })
      this.interpretedText = r.cleanPrompt || this.rawText
    } catch {
      this.interpretedText = this.rawText
    } finally {
      this.previewing = false
    }
  }

  onBack(): void {
    if (this.step === 'confirm')       this.step = 'input'
    else if (this.step === 'select_module') this.step = 'confirm'
  }

  async onConfirm(): Promise<void> {
    this.step          = 'select_module'
    this.loadingModules = true
    this.selectedModuleId   = null
    this.selectedModuleName = ''
    try {
      const tree = await this.api.get<TreeNode[]>('/modules/tree', { projectId: this.projectId || 'default' })
      this.flatModules = this.flatten(tree ?? [])
    } catch {
      this.flatModules = []
    } finally {
      this.loadingModules = false
    }
  }

  private flatten(nodes: TreeNode[]): FlatModule[] {
    const out: FlatModule[] = []
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name, depth: n.depth, path: n.path })
      if (n.children?.length) out.push(...this.flatten(n.children))
    }
    return out
  }

  selectModule(id: number | null, name: string): void {
    this.selectedModuleId   = id
    this.selectedModuleName = name
  }

  async onSave(): Promise<void> {
    if (this.saving) return
    this.saving = true
    try {
      const res = await this.api.post<any>('/requirements/create', {
        title:     this.rawText,
        projectId: this.projectId || 'default',
        moduleId:  this.selectedModuleId,
        createdBy: 'BA',
      })
      this.requirementSaved.emit({
        id:          res.id,
        tokens:      res.tokens,
        cleanPrompt: res.cleanPrompt,
        moduleId:    res.moduleId ?? null,
        moduleName:  this.selectedModuleName || null,
      })
      this.rawText            = ''
      this.wordCount          = 0
      this.interpretedText    = ''
      this.selectedModuleId   = null
      this.selectedModuleName = ''
      this.step               = 'input'
    } finally {
      this.saving = false
    }
  }

  onRegenerate(): void {
    if (!this.rawText.trim()) return
    this.regenerate.emit({ title: this.rawText, description: '', feedback: this.feedback })
    this.feedback     = ''
    this.showFeedback = false
  }
}
