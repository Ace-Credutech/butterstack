import { z } from 'zod';
import { ProjectMember } from '@models/project-member.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  member_id: z.string().uuid(),
});

type Payload = z.infer<typeof payload_schema>;

const fetch_member = async (project_id: string, member_id: string, transaction: any) =>
  ProjectMember.findOne({ where: { id: member_id, project_id, deleted_at: null }, transaction });

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const member = await fetch_member(scope.project_id, payload.member_id, transaction);
  if (!member) return { code: 404, message: 'Member not found' };

  await member.destroy({ transaction });

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'member.remove',
    entity:      'ProjectMember',
    entity_id:   member.id,
    description: `Removed member ${member.name} <${member.email}>`,
  }, transaction);

  return {
    state_delta: {
      member: { id: member.id, deleted: true },
    },
    affected_entities: { project_members: [member.id], projects: [scope.project_id] },
  };
};

export const member_remove_handler: EventHandlerDetails = {
  type:           'member.remove',
  payload_schema,
  handler:        handler as any,
};
