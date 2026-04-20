import { Injectable, signal, computed } from '@angular/core'
import { Router } from '@angular/router'
import { ApiService } from './api.service'

export interface User {
  id: number
  name: string
  email: string
  mobile: string
  countryCode: string
}

interface AuthResponse {
  user: User
  token: string
  redirectProjectId?: number
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null)

  user = this._user.asReadonly()
  loggedIn = computed(() => !!this._user())

  constructor(private api: ApiService, private router: Router) {
    const stored = localStorage.getItem('bs_user')
    if (stored) {
      try { this._user.set(JSON.parse(stored)) } catch { localStorage.removeItem('bs_user') }
    }
  }

  get token(): string | null {
    return localStorage.getItem('bs_token')
  }

  async register(data: { name: string; email: string; password: string; mobile: string; countryCode: string }): Promise<void> {
    const res = await this.api.post<AuthResponse>('/auth/register', data)
    this.setSession(res)
  }

  async registerWithInvite(data: { name: string; email: string; password: string; mobile: string; countryCode: string }, inviteToken: string): Promise<AuthResponse> {
    const res = await this.api.post<AuthResponse>('/auth/register', { ...data, inviteToken })
    this.setSession(res)
    return res
  }

  async login(email: string, password: string): Promise<void> {
    const res = await this.api.post<AuthResponse>('/auth/login', { email, password })
    this.setSession(res)
  }

  logout() {
    localStorage.removeItem('bs_token')
    localStorage.removeItem('bs_user')
    this._user.set(null)
    this.router.navigate(['/login'])
  }

  async loadMe(): Promise<boolean> {
    if (!this.token) return false
    try {
      const user = await this.api.get<User>('/auth/me')
      this._user.set(user)
      localStorage.setItem('bs_user', JSON.stringify(user))
      return true
    } catch {
      this.logout()
      return false
    }
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem('bs_token', res.token)
    localStorage.setItem('bs_user', JSON.stringify(res.user))
    this._user.set(res.user)
  }
}
