import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector:    'bs-step-conversation',
  imports:     [FormsModule],
  templateUrl: './step-conversation.html',
})
export class StepConversation {
  user_input = '';

  messages = [
    {
      role: 'ai',
      content: 'AI Understanding → Directly Provided and Context Gathered. Basic Understanding → Will be displayed.\n\nConfirm whether this is correct?\n\n- Looks Good\n- Needs Correction\n- Say what you want?',
    },
  ];

  send() {
    if (!this.user_input) return;
    this.messages.push({ role: 'user', content: this.user_input });
    this.user_input = '';
  }

  on_key(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }
}
