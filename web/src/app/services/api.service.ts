import { Injectable }   from '@angular/core'
import { HttpClient }   from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment }  from '../../environments/environment'

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.url(path, params)))
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.url(path), body))
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(this.url(path), body))
  }

  delete<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.url(path)))
  }

  private url(path: string, params?: Record<string, string>): string {
    const base = `${this.base}${path.startsWith('/') ? path : '/' + path}`
    if (!params) return base
    const qs = new URLSearchParams(params).toString()
    return `${base}?${qs}`
  }
}
