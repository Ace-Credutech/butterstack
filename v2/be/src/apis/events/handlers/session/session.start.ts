import { z } from 'zod';
import { Session } from '@models/session.model';
import { SessionParticipant } from '@models/session-participant.model';
import { ProjectMember } from '@models/project-member.model';
import { User } from '@models/user.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const participant_schema = z.object({
  kind:         z.enum(['human', 'ai', 'system']).default('human'),
  member_id:    z.string().uuid().nullable().optional(),
  user_id:      z.string().uuid().nullable().optional(),
  display_name: z.string().trim().min(1).max(240).optional(),
});

const payload_schema = z.object({
  kind:                 z.enum(['clarification', 'quiz', 'review']).default('clarification'),
  title:                z.string().trim().max(240).nullable().optional(),
  initial_participants: z.array(participant_schema).optional(),
});

type Payload = z.infer<typeof payload_schema>;
type ParticipantInput = z.infer<typeof participant_schema>;

const fetch_starter = async (user_id: string, transaction: any) =>
  User.findByPk(user_id, { transaction });

const create_session = (session_id: string, scope: any, payload: Payload, ctx: any, transaction: any) =>
  Session.create({
    id:         session_id,
    project_id: scope.project_id,
    kind:       payload.kind,
    title:      payload.title ?? null,
    started_by: ctx.actor.id,
  } as any, { transaction });

const resolve_display_name = async (p: ParticipantInput, transaction: any): Promise<string> => {
  if (p.display_name) return p.display_name;
  if (p.member_id) {
    const m = await ProjectMember.findByPk(p.member_id, { transaction });
    if (m) return m.name;
  }
  if (p.user_id) {
    const u = await User.findByPk(p.user_id, { transaction });
    if (u) return (u as any).name ?? (u as any).email ?? 'User';
  }
  return p.kind === 'ai' ? 'AI Assistant' : p.kind === 'system' ? 'System' : 'Participant';
};

const create_participant = async (session_id: string, p: ParticipantInput, transaction: any) =>
  SessionParticipant.create({
    session_id,
    user_id:      p.user_id ?? null,
    member_id:    p.member_id ?? null,
    kind:         p.kind,
    display_name: await resolve_display_name(p, transaction),
    joined_at:    new Date(),
  } as any, { transaction });

const ensure_starter_participant = async (session_id: string, ctx: any, transaction: any) => {
  const starter = await fetch_starter(ctx.actor.id, transaction);
  return SessionParticipant.create({
    session_id,
    user_id:      ctx.actor.id,
    member_id:    null,
    kind:         'human',
    display_name: (starter as any)?.name ?? (starter as any)?.email ?? 'You',
    joined_at:    new Date(),
  } as any, { transaction });
};

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  if (!scope.session_id) return { code: 400, message: 'scope.session_id is required to start a session' };

  const session = await create_session(scope.session_id, scope, payload, ctx, transaction);
  await ensure_starter_participant(session.id, ctx, transaction);

  const extra_participants = payload.initial_participants ?? [];
  const created_participants = await Promise.all(
    extra_participants.map(p => create_participant(session.id, p, transaction)),
  );

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'session.start',
    entity:      'Session',
    entity_id:   session.id,
    description: `Started ${session.kind} session "${session.title ?? '(untitled)'}"`,
  }, transaction);

  return {
    state_delta: {
      session: {
        id:         session.id,
        project_id: session.project_id,
        kind:       session.kind,
        title:      session.title,
        started_by: session.started_by,
        ended_at:   session.ended_at,
      },
      participants_added: created_participants.length + 1,
    },
    affected_entities: { sessions: [session.id], projects: [scope.project_id] },
  };
};

export const session_start_handler: EventHandlerDetails = {
  type:           'session.start',
  payload_schema,
  handler:        handler as any,
};
