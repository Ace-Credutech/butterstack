import { z } from 'zod';
import { Op } from 'sequelize';
import { ProjectMember } from '@models/project-member.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  name:             z.string().trim().min(1),
  email:            z.string().trim().email(),
  designation:      z.string().trim().min(1),
  stakeholder_role: z.enum(['decider', 'reviewer', 'contributor', 'observer']),
  authority_rank:   z.number().int().min(1),
});

type Payload = z.infer<typeof payload_schema>;

const find_email_conflict = async (project_id: string, email: string, transaction: any) =>
  ProjectMember.findOne({ where: { project_id, email: { [Op.iLike]: email }, deleted_at: null }, transaction });

const create_member = (payload: Payload, project_id: string, invited_by: string, transaction: any) =>
  ProjectMember.create({
    project_id,
    user_id:          null,
    invited_by,
    email:            payload.email,
    name:             payload.name,
    designation:      payload.designation,
    stakeholder_role: payload.stakeholder_role,
    authority_rank:   payload.authority_rank,
  } as any, { transaction });

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const conflict = await find_email_conflict(scope.project_id, payload.email, transaction);
  if (conflict) return { code: 409, message: `Member with email ${payload.email} already exists in this project` };

  const member = await create_member(payload, scope.project_id, ctx.actor.id, transaction);

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'member.add',
    entity:      'ProjectMember',
    entity_id:   member.id,
    description: `Added member ${member.name} <${member.email}> as ${member.stakeholder_role}`,
  }, transaction);

  return {
    state_delta: {
      member: {
        id:               member.id,
        project_id:       member.project_id,
        email:            member.email,
        name:             member.name,
        designation:      member.designation,
        stakeholder_role: member.stakeholder_role,
        authority_rank:   member.authority_rank,
      },
    },
    affected_entities: { project_members: [member.id], projects: [scope.project_id] },
  };
};

export const member_add_handler: EventHandlerDetails = {
  type:           'member.add',
  payload_schema,
  handler:        handler as any,
};
