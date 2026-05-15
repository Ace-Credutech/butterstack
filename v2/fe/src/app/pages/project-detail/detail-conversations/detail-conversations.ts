import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Conversation {
  id:       string;
  title:    string;
  status:   string;
  messages: number;
  ago:      string;
  avatar:   string;
}

interface ChatMessage {
  id:   string;
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector:    'bs-detail-conversations',
  imports:     [FormsModule],
  templateUrl: './detail-conversations.html',
})
export class DetailConversations {
  @Input() conversations: Conversation[] = [];
  @Output() select = new EventEmitter<string>();
  @Output() new_click = new EventEmitter<void>();

  view: 'list' | 'chat' = 'list';
  chat_input = '';
  chat_messages: ChatMessage[] = [];

  open_chat() {
    this.chat_messages = [];
    this.chat_input = '';
    this.view = 'chat';
  }

  send_message() {
    if (!this.chat_input.trim()) return;
    this.chat_messages.push({
      id:   String(Date.now()),
      role: 'user',
      text: this.chat_input.trim(),
    });
    const input = this.chat_input.trim();
    this.chat_input = '';
    setTimeout(() => {
      this.chat_messages.push({
        id:   String(Date.now()),
        role: 'assistant',
        text: 'I\'ll help you structure "' + input + '". Let me analyze the requirements...',
      });
    }, 500);
  }
}
