import { Component }   from '@angular/core'
import { Router }      from '@angular/router'
import { AuthService } from '../../services/auth.service'

@Component({
  selector:    'app-landing',
  standalone:  true,
  imports:     [],
  templateUrl: './landing.component.html',
})
export class LandingComponent {
  features = ['Multilingual Requirements', 'AI Prototyping', 'Auto Module Tree', 'Version History', 'Live Documentation', 'Meeting Mode']
  constructor(private router: Router, private auth: AuthService) {}
  goToProjects(): void { this.router.navigate([this.auth.token ? '/projects' : '/register']) }
  signIn():      void { this.router.navigate([this.auth.token ? '/projects' : '/login']) }
}
