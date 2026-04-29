import { z } from 'zod';
import { Session } from '@models/session.model';
import { SessionParticipant } from '@models/session-participant.model';
import { Message } from '@models/message.model';
import { User } from '@models/user.model';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  content:          z.string().trim().min(1),
  role:             z.enum(['user', 'ai', 'system']).default('user'),
  channel:          z.string().trim().max(40).nullable().optional(),
  reply_to:         z.string().uuid().nullable().optional(),
  participant_id:   z.string().uuid().nullable().optional(),
  attachments_json: z.unknown().nullable().optional(),
});

type Payload = z.infer<typeof payload_schema>;

const fetch_session = async (project_id: string, session_id: string, transaction: any) =>
  Session.findOne({ where: { id: session_id, project_id }, transaction });

const find_or_create_participant_for_actor = async (session_id: string, actor_id: string, transaction: any) => {
  const existing = await SessionParticipant.findOne({ where: { session_id, user_id: actor_id }, transaction });
  if (existing) return existing;
  const user = await User.findByPk(actor_id, { transaction });
  return SessionParticipant.create({
    session_id,
    user_id:      actor_id,
    member_id:    null,
    kind:         'human',
    display_name: (user as any)?.name ?? (user as any)?.email ?? 'Participant',
    joined_at:    new Date(),
  } as any, { transaction });
};

const resolve_participant_id = async (session_id: string, payload: Payload, ctx: any, transaction: any): Promise<string | null> => {
  if (payload.participant_id) {
    const p = await SessionParticipant.findOne({ where: { id: payload.participant_id, session_id }, transaction });
    if (!p) return null;
    return p.id;
  }
  if (payload.role !== 'user') return null;
  const auto = await find_or_create_participant_for_actor(session_id, ctx.actor.id, transaction);
  return auto.id;
};

const create_message = (session_id: string, project_id: string, participant_id: string | null, payload: Payload, transaction: any) =>
  Message.create({
    session_id,
    project_id,
    participant_id,
    role:             payload.role,
    channel:          payload.channel ?? null,
    content:          payload.content,
    reply_to:         payload.reply_to ?? null,
    attachments_json: (payload.attachments_json ?? null) as any,
  } as any, { transaction });

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  if (!scope.session_id) return { code: 400, message: 'scope.session_id is required' };

  const session = await fetch_session(scope.project_id, scope.session_id, transaction);
  if (!session)         return { code: 404, message: 'Session not found' };
  if (session.ended_at) return { code: 409, message: 'Session is ended; cannot add messages' };

  const participant_id = await resolve_participant_id(session.id, payload, ctx, transaction);
  const message        = await create_message(session.id, scope.project_id, participant_id, payload, transaction);

  return {
    state_delta: {
      message: {
        id:             message.id,
        session_id:     message.session_id,
        project_id:     message.project_id,
        participant_id: message.participant_id,
        role:           message.role,
        channel:        message.channel,
        content:        message.content,
        reply_to:       message.reply_to,
        created_at:     message.created_at,
      },
    },
    affected_entities: { messages: [message.id], sessions: [session.id], projects: [scope.project_id] },
  };
};

export const message_add_handler: EventHandlerDetails = {
  type:           'message.add',
  payload_schema,
  handler:        handler as any,
};
