import axios from 'axios';
import { env } from '@src/env';
import { log } from '@setup/log';

export type EmailMessage = {
  to:        string;
  to_name?:  string;
  subject:   string;
  html:      string;
  text?:     string;
};

const sender = () => ({ name: env.BREVO_SENDER_NAME, email: env.BREVO_SENDER_EMAIL });

const send_via_brevo = async (msg: EmailMessage): Promise<void> => {
  const body = {
    sender:      sender(),
    to:          [{ email: msg.to, name: msg.to_name }],
    subject:     msg.subject,
    htmlContent: msg.html,
    textContent: msg.text,
  };
  const res = await axios.post('https://api.brevo.com/v3/smtp/email', body, {
    headers: { 'api-key': env.BREVO_API_KEY!, 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });
  if (res.status >= 400) throw { code: res.status, message: 'Brevo email send failed', details: res.data };
  log.info('email.sent', { to: msg.to, subject: msg.subject, brevo_message_id: (res.data as any)?.messageId });
};

const send_via_console = async (msg: EmailMessage): Promise<void> => {
  log.info('email.console', { to: msg.to, subject: msg.subject, body_preview: msg.text ?? msg.html.slice(0, 200) });
};

export const send_email = async (msg: EmailMessage): Promise<void> => {
  if (!env.BREVO_API_KEY) return send_via_console(msg);
  return send_via_brevo(msg);
};
