import { Component }   from '@angular/core'
import { Router }      from '@angular/router'
import { AuthService } from '../../services/auth.service'
import { UserAvatarComponent } from '../../components/user-avatar/user-avatar.component'

@Component({
  selector:    'app-landing',
  standalone:  true,
  imports:     [UserAvatarComponent],
  templateUrl: './landing.component.html',
})
export class LandingComponent {
  features = ['Multilingual Requirements', 'AI Prototyping', 'Auto Module Tree', 'Version History', 'Live Documentation', 'Meeting Mode']
  constructor(private router: Router, public auth: AuthService) {}
  goToProjects(): void { this.router.navigate([this.auth.token ? '/projects' : '/register']) }
  signIn():      void { this.router.navigate([this.auth.token ? '/projects' : '/login']) }
}
