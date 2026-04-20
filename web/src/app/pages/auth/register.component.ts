import { Component, signal } from '@angular/core'
import { FormsModule }       from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { AuthService }       from '../../services/auth.service'

interface CountryOption { name: string; code: string; dial: string }

@Component({
  selector:   'app-register',
  standalone: true,
  imports:    [FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  name         = ''
  email        = ''
  password     = ''
  mobile       = ''
  countryCode  = '+91'
  showPassword = signal(false)
  error        = signal('')
  loading      = signal(false)

  countries: CountryOption[] = [
    { name: 'India',          code: 'IN', dial: '+91'  },
    { name: 'United States',  code: 'US', dial: '+1'   },
    { name: 'United Kingdom', code: 'GB', dial: '+44'  },
    { name: 'Canada',         code: 'CA', dial: '+1'   },
    { name: 'Australia',      code: 'AU', dial: '+61'  },
    { name: 'Germany',        code: 'DE', dial: '+49'  },
    { name: 'France',         code: 'FR', dial: '+33'  },
    { name: 'Singapore',      code: 'SG', dial: '+65'  },
    { name: 'UAE',            code: 'AE', dial: '+971' },
    { name: 'Japan',          code: 'JP', dial: '+81'  },
    { name: 'Brazil',         code: 'BR', dial: '+55'  },
    { name: 'South Africa',   code: 'ZA', dial: '+27'  },
  ]

  constructor(private auth: AuthService, private router: Router) {
    if (auth.token) this.router.navigate(['/projects'])
  }

  async submit() {
    if (!this.name.trim() || !this.email.trim() || !this.password || !this.mobile.trim()) return
    this.loading.set(true)
    this.error.set('')
    try {
      await this.auth.register({ name: this.name, email: this.email, password: this.password, mobile: this.mobile, countryCode: this.countryCode })
      this.router.navigate(['/projects'])
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Registration failed')
    } finally {
      this.loading.set(false)
    }
  }
}
