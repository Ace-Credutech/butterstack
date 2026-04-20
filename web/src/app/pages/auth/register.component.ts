import { Component, signal, OnInit } from '@angular/core'
import { FormsModule }       from '@angular/forms'
import { Router, RouterLink, ActivatedRoute } from '@angular/router'
import { AuthService }       from '../../services/auth.service'
import { ApiService }        from '../../services/api.service'

interface CountryOption { name: string; code: string; dial: string }

@Component({
  selector:   'app-register',
  standalone: true,
  imports:    [FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  name         = ''
  email        = ''
  password     = ''
  mobile       = ''
  countryCode  = '+91'
  showPassword = signal(false)
  error        = signal('')
  loading      = signal(false)

  inviteToken  = ''
  inviteProject = signal('')
  emailLocked   = signal(false)

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

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute, private api: ApiService) {
    if (auth.token) this.router.navigate(['/projects'])
  }

  async ngOnInit() {
    this.inviteToken = this.route.snapshot.queryParamMap.get('invite') || ''
    if (this.inviteToken) {
      try {
        const inv = await this.api.get<{ email: string; projectName: string }>(`/auth/invite/${this.inviteToken}`)
        this.email = inv.email
        this.emailLocked.set(true)
        this.inviteProject.set(inv.projectName)
      } catch {
        this.error.set('Invitation link is invalid or expired')
      }
    }
  }

  async submit() {
    if (!this.name.trim() || !this.email.trim() || !this.password || !this.mobile.trim()) return
    this.loading.set(true)
    this.error.set('')
    try {
      const res = await this.auth.registerWithInvite(
        { name: this.name, email: this.email, password: this.password, mobile: this.mobile, countryCode: this.countryCode },
        this.inviteToken
      )
      if (res.redirectProjectId) {
        this.router.navigate(['/projects', res.redirectProjectId])
      } else {
        this.router.navigate(['/projects'])
      }
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Registration failed')
    } finally {
      this.loading.set(false)
    }
  }
}
