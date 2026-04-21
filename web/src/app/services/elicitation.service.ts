import { Injectable } from '@angular/core'
import { ApiService } from './api.service'

export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  type: string
  options?: { id: string; label: string; description?: string }[]
  selected?: string | string[]
  breakdown?: BreakdownProposal
  created_at?: string
}

export interface BreakdownProposal {
  modules: { name: string; subModules: { name: string; features: string[] }[] }[]
  pages: { name: string; pageType: string; linkedFeatures: string[] }[]
}

export interface ElicitationSession {
  id: number
  project_id: string
  status: string
  title?: string
  message_count?: number
  user_name?: string
  created_at: string
  updated_at: string
}

@Injectable({ providedIn: 'root' })
export class ElicitationService {
  constructor(private api: ApiService) {}

  createSession(projectId: string): Promise<{ id: number }> {
    return this.api.post('/elicitation/sessions', { projectId })
  }

  listSessions(projectId: string): Promise<ElicitationSession[]> {
    return this.api.get('/elicitation/sessions', { projectId })
  }

  getSession(id: number): Promise<any> {
    return this.api.get(`/elicitation/sessions/${id}`)
  }

  sendMessage(sessionId: number, content: string, type = 'text', selected?: string | string[], images?: string[]): Promise<ChatMessage> {
    return this.api.post(`/elicitation/sessions/${sessionId}/messages`, { content, type, selected, images })
  }

  completeSession(sessionId: number): Promise<{ ok: boolean; created: { modules: number; features: number; pages: number } }> {
    return this.api.post(`/elicitation/sessions/${sessionId}/complete`, {})
  }
}
