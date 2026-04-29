import { z } from 'zod';
import { Session } from '@models/session.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({});

type Payload = z.infer<typeof payload_schema>;

const fetch_session = async (project_id: string, session_id: string, transaction: any) =>
  Session.findOne({ where: { id: session_id, project_id }, transaction });

const handler: EventHandler<Payload> = async (_payload, scope, ctx, transaction) => {
  if (!scope.session_id) return { code: 400, message: 'scope.session_id is required' };

  const session = await fetch_session(scope.project_id, scope.session_id, transaction);
  if (!session)        return { code: 404, message: 'Session not found' };
  if (session.ended_at) return { code: 409, message: 'Session is already ended' };

  await session.update({ ended_at: new Date() } as any, { transaction });

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'session.end',
    entity:      'Session',
    entity_id:   session.id,
    description: `Ended session "${session.title ?? session.kind}"`,
  }, transaction);

  return {
    state_delta: {
      session: { id: session.id, ended_at: session.ended_at },
    },
    affected_entities: { sessions: [session.id], projects: [scope.project_id] },
  };
};

export const session_end_handler: EventHandlerDetails = {
  type:           'session.end',
  payload_schema,
  handler:        handler as any,
};
