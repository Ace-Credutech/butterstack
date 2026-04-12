import { Injectable }  from '@angular/core'
import { ApiService }  from './api.service'
import { GenerateResponse, RegenerateResponse } from '../models/ui-tokens.model'

@Injectable({ providedIn: 'root' })
export class PrototypeService {
  constructor(private api: ApiService) {}

  generate(title: string, description: string): Promise<GenerateResponse> {
    return this.api.post<GenerateResponse>('/prototype/generate', { title, description })
  }

  regenerate(title: string, description: string, feedback: string): Promise<RegenerateResponse> {
    return this.api.post<RegenerateResponse>('/prototype/regenerate', { title, description, feedback })
  }

  autoAssign(tokens: any, label: string, cleanPrompt: string, projectId: string): Promise<{ moduleId: number; modulePath: string[]; path: string }> {
    return this.api.post('/modules/auto-assign', { tokens, label, cleanPrompt, projectId })
  }
}
