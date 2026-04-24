import { log } from '@setup/log';
import { broadcast_to_user, broadcast_to_project } from '@setup/ws/ws-server';

export type NotifyKind = 'ws' | 'email' | 'push' | 'slack';

export type NotifyTarget =
  | { kind: 'user';    user_id: string }
  | { kind: 'project'; project_id: string }
  | { kind: 'email';   email: string }
  | { kind: 'phone';   phone: string }
  | { kind: 'slack';   channel: string };

export type NotifyInput = {
  kinds:   NotifyKind[];
  to:      NotifyTarget[];
  payload: { type: string; title?: string; body?: string; data?: unknown };
};

const send_ws = async (input: NotifyInput) => {
  for (const target of input.to) {
    if (target.kind === 'user')    await broadcast_to_user(target.user_id, { type: input.payload.type, payload: input.payload });
    if (target.kind === 'project') await broadcast_to_project(target.project_id, { type: input.payload.type, payload: input.payload });
  }
};

const send_email = async (input: NotifyInput) => {
  const emails = input.to.filter((t): t is Extract<NotifyTarget, { kind: 'email' }> => t.kind === 'email');
  log.info('notifier.email.stub', { count: emails.length, payload_type: input.payload.type });
};

const send_push  = async (input: NotifyInput) => log.info('notifier.push.stub',  { payload_type: input.payload.type });
const send_slack = async (input: NotifyInput) => log.info('notifier.slack.stub', { payload_type: input.payload.type });

const senders: Record<NotifyKind, (i: NotifyInput) => Promise<void>> = {
  ws:    send_ws,
  email: send_email,
  push:  send_push,
  slack: send_slack,
};

export const notify = async (input: NotifyInput): Promise<void> => {
  for (const kind of input.kinds) { await senders[kind](input).catch(e => log.warn(`notifier.${kind}.fail`, { error: String(e?.message ?? e) })); }
};
