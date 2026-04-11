import { Injectable }                from '@angular/core'
import { HttpClient }               from '@angular/common/http'
import { Observable }               from 'rxjs'
import { GenerateResponse, RegenerateResponse } from '../models/ui-tokens.model'

const API = 'http://localhost:3000'

@Injectable({ providedIn: 'root' })
export class PrototypeService {
  constructor(private http: HttpClient) {}

  generate(title: string, description: string): Observable<GenerateResponse> {
    return this.http.post<GenerateResponse>(`${API}/prototype/generate`, { title, description })
  }

  regenerate(title: string, description: string, feedback: string): Observable<RegenerateResponse> {
    return this.http.post<RegenerateResponse>(`${API}/prototype/regenerate`, { title, description, feedback })
  }

  autoAssign(tokens: any, label: string, cleanPrompt: string): Observable<{ moduleId: number; modulePath: string[]; path: string }> {
    return this.http.post<{ moduleId: number; modulePath: string[]; path: string }>(
      `${API}/modules/auto-assign`, { tokens, label, cleanPrompt }
    )
  }
}
