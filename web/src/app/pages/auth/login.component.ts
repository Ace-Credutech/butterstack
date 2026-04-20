import { Component, signal } from '@angular/core'
import { FormsModule }       from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { AuthService }       from '../../services/auth.service'

@Component({
  selector:   'app-login',
  standalone: true,
  imports:    [FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email        = ''
  password     = ''
  showPassword = signal(false)
  error        = signal('')
  loading      = signal(false)

  constructor(private auth: AuthService, private router: Router) {
    if (auth.token) this.router.navigate(['/projects'])
  }

  async submit() {
    if (!this.email.trim() || !this.password) return
    this.loading.set(true)
    this.error.set('')
    try {
      await this.auth.login(this.email, this.password)
      this.router.navigate(['/projects'])
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Login failed')
    } finally {
      this.loading.set(false)
    }
  }
}
