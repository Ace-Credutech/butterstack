import { Component, Input, Output, EventEmitter, signal, OnInit, HostListener } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { JsonPipe } from '@angular/common'
import { ApiService } from '../../services/api.service'

interface DesignSystem {
  primaryColor: string
  primaryHover: string
  primaryLight: string
  primaryText: string
  fontFamily: string
  borderRadius: string
}

interface ColorPreset {
  name: string
  primary: string
  hover: string
  light: string
  text: string
}

@Component({
  selector: 'app-design-settings',
  standalone: true,
  imports: [FormsModule, JsonPipe],
  templateUrl: './design-settings.component.html',
})
export class DesignSettingsComponent implements OnInit {
  @Input() projectId = ''
  @Output() designSaved = new EventEmitter<void>()

  open    = signal(false)
  loading = signal(false)
  saving  = signal(false)
  ds      = signal<DesignSystem>({
    primaryColor: 'bg-green-600', primaryHover: 'hover:bg-green-700',
    primaryLight: 'bg-green-50', primaryText: 'text-green-700',
    fontFamily: 'font-sans', borderRadius: 'rounded-lg',
  })

  presets: ColorPreset[] = [
    { name: 'Green',  primary: 'bg-green-600',  hover: 'hover:bg-green-700',  light: 'bg-green-50',  text: 'text-green-700' },
    { name: 'Blue',   primary: 'bg-blue-600',   hover: 'hover:bg-blue-700',   light: 'bg-blue-50',   text: 'text-blue-700' },
    { name: 'Purple', primary: 'bg-purple-600', hover: 'hover:bg-purple-700', light: 'bg-purple-50', text: 'text-purple-700' },
    { name: 'Red',    primary: 'bg-red-600',    hover: 'hover:bg-red-700',    light: 'bg-red-50',    text: 'text-red-700' },
    { name: 'Amber',  primary: 'bg-amber-600',  hover: 'hover:bg-amber-700',  light: 'bg-amber-50',  text: 'text-amber-700' },
    { name: 'Teal',   primary: 'bg-teal-600',   hover: 'hover:bg-teal-700',   light: 'bg-teal-50',   text: 'text-teal-700' },
    { name: 'Indigo', primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', light: 'bg-indigo-50', text: 'text-indigo-700' },
    { name: 'Pink',   primary: 'bg-pink-600',   hover: 'hover:bg-pink-700',   light: 'bg-pink-50',   text: 'text-pink-700' },
    { name: 'Slate',  primary: 'bg-slate-700',  hover: 'hover:bg-slate-800',  light: 'bg-slate-50',  text: 'text-slate-700' },
  ]

  radiusOptions = [
    { label: 'None', value: 'rounded-none' },
    { label: 'Small', value: 'rounded' },
    { label: 'Medium', value: 'rounded-md' },
    { label: 'Large', value: 'rounded-lg' },
    { label: 'XL', value: 'rounded-xl' },
    { label: 'Full', value: 'rounded-full' },
  ]

  fontOptions = [
    { label: 'System (Sans)', value: 'font-sans' },
    { label: 'Serif', value: 'font-serif' },
    { label: 'Mono', value: 'font-mono' },
  ]

  constructor(private api: ApiService) {}

  async ngOnInit() { await this.load() }

  toggle() {
    this.open.update(v => !v)
    if (this.open()) this.load()
  }

  async load() {
    this.loading.set(true)
    try {
      this.ds.set(await this.api.get<DesignSystem>(`/projects/${this.projectId}/design-system`))
    } catch {}
    this.loading.set(false)
  }

  selectPreset(preset: ColorPreset) {
    this.ds.update(d => ({ ...d, primaryColor: preset.primary, primaryHover: preset.hover, primaryLight: preset.light, primaryText: preset.text }))
  }

  setRadius(value: string) { this.ds.update(d => ({ ...d, borderRadius: value })) }
  setFont(value: string) { this.ds.update(d => ({ ...d, fontFamily: value })) }

  isActivePreset(preset: ColorPreset): boolean { return this.ds().primaryColor === preset.primary }

  async save() {
    this.saving.set(true)
    await this.api.patch(`/projects/${this.projectId}/design-system`, this.ds())
    this.saving.set(false)
    this.open.set(false)
    this.designSaved.emit()
  }

  presetBgClass(preset: ColorPreset): string { return preset.primary }

  @HostListener('document:keydown.escape')
  onEsc() { this.open.set(false) }
}
