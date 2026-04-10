import { Component, Input, Output, EventEmitter } from '@angular/core'
import type { VersionEntry }                       from '../../models/ui-tokens.model'

@Component({
  selector:    'app-version-timeline',
  standalone:  true,
  templateUrl: './version-timeline.component.html',
})
export class VersionTimelineComponent {
  @Input()  versions: VersionEntry[] = []
  @Input()  meetingActive = false
  @Input()  meetingTime   = '00:00'
  @Output() restore        = new EventEmitter<VersionEntry>()
  @Output() toggleMeeting  = new EventEmitter<void>()
}
