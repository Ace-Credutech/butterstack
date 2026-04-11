import { Component } from '@angular/core'
import { Router }    from '@angular/router'

@Component({
  selector:    'app-landing',
  standalone:  true,
  imports:     [],
  templateUrl: './landing.component.html',
})
export class LandingComponent {
  features = ['Multilingual Requirements', 'AI Prototyping', 'Auto Module Tree', 'Version History', 'Live Documentation', 'Meeting Mode']
  constructor(private router: Router) {}
  goToProjects(): void { this.router.navigate(['/projects']) }
}
