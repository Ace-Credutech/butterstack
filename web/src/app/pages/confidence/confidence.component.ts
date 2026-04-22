import { Component, OnInit, signal } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { ApiService } from '../../services/api.service'

interface FeatureRow { id: number; name: string; module_name: string; module_path: string; confidence_score: any; status: string; summary: string }
interface ModuleScore { name: string; score: number; featureCount: number }

@Component({
  selector: 'app-confidence',
  standalone: true,
  templateUrl: './confidence.component.html',
})
export class ConfidenceComponent implements OnInit {
  projectId = ''
  projectName = signal('')
  features = signal<FeatureRow[]>([])
  modules = signal<ModuleScore[]>([])
  projectScore = signal(0)
  loading = signal(true)

  stats = signal<{ at100: number; below50: number; openQuestions: number; improved: string }>({ at100: 0, below50: 0, openQuestions: 0, improved: '' })

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  async ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? ''
    const project = await this.api.get<any>(`/projects/${this.projectId}`)
    this.projectName.set(project.name)

    const feats = await this.api.get<any[]>('/features', { projectId: this.projectId })
    this.features.set(feats.sort((a, b) => (a.confidence_score?.overall ?? 0) - (b.confidence_score?.overall ?? 0)))

    // Calculate module scores
    const moduleMap: Record<string, { scores: number[]; count: number }> = {}
    for (const f of feats) {
      const mod = f.module_name || 'Unknown'
      if (!moduleMap[mod]) moduleMap[mod] = { scores: [], count: 0 }
      moduleMap[mod].scores.push(f.confidence_score?.overall ?? 0)
      moduleMap[mod].count++
    }
    const mods = Object.entries(moduleMap).map(([name, data]) => ({
      name,
      score: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100),
      featureCount: data.count,
    })).sort((a, b) => a.score - b.score)
    this.modules.set(mods)

    // Project score
    const allScores = feats.map(f => f.confidence_score?.overall ?? 0)
    const avg = allScores.length ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) : 0
    this.projectScore.set(avg)

    // Stats
    const at100 = feats.filter(f => Math.round((f.confidence_score?.overall ?? 0) * 100) >= 100).length
    const below50 = feats.filter(f => Math.round((f.confidence_score?.overall ?? 0) * 100) < 50).length
    this.stats.set({ at100, below50, openQuestions: below50 * 2, improved: feats[feats.length - 1]?.name || '—' })

    this.loading.set(false)
  }

  Math = Math

  fcsPercent(f: FeatureRow): number { return Math.round((f.confidence_score?.overall ?? 0) * 100) }

  scoreColor(score: number): string {
    if (score >= 80) return 'text-green-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  scoreBg(score: number): string {
    if (score >= 80) return 'bg-green-500'
    if (score >= 50) return 'bg-amber-400'
    return 'bg-red-500'
  }

  back() { this.router.navigate(['/projects', this.projectId]) }
}
