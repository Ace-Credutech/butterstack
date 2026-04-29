import { z } from 'zod';
import { Op } from 'sequelize';
import { ProjectMember } from '@models/project-member.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  member_id:        z.string().uuid(),
  name:             z.string().trim().min(1).optional(),
  email:            z.string().trim().email().optional(),
  designation:      z.string().trim().min(1).optional(),
  stakeholder_role: z.enum(['decider', 'reviewer', 'contributor', 'observer']).optional(),
  authority_rank:   z.number().int().min(1).optional(),
});

type Payload = z.infer<typeof payload_schema>;

const fetch_member = async (project_id: string, member_id: string, transaction: any) =>
  ProjectMember.findOne({ where: { id: member_id, project_id, deleted_at: null }, transaction });

const find_email_conflict = async (project_id: string, member_id: string, email: string, transaction: any) =>
  ProjectMember.findOne({
    where: {
      project_id,
      email:      { [Op.iLike]: email },
      id:         { [Op.ne]: member_id },
      deleted_at: null,
    },
    transaction,
  });

const apply_updates = async (member: ProjectMember, payload: Payload, transaction: any) => {
  const patch: Record<string, unknown> = {};
  if (payload.name             !== undefined) patch.name             = payload.name;
  if (payload.email            !== undefined) patch.email            = payload.email;
  if (payload.designation      !== undefined) patch.designation      = payload.designation;
  if (payload.stakeholder_role !== undefined) patch.stakeholder_role = payload.stakeholder_role;
  if (payload.authority_rank   !== undefined) patch.authority_rank   = payload.authority_rank;
  return member.update(patch as any, { transaction });
};

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const member = await fetch_member(scope.project_id, payload.member_id, transaction);
  if (!member) return { code: 404, message: 'Member not found' };

  if (payload.email) {
    const conflict = await find_email_conflict(scope.project_id, member.id, payload.email, transaction);
    if (conflict) return { code: 409, message: `Member with email ${payload.email} already exists in this project` };
  }

  const updated = await apply_updates(member, payload, transaction);

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'member.update',
    entity:      'ProjectMember',
    entity_id:   updated.id,
    description: `Updated member ${updated.name} <${updated.email}>`,
  }, transaction);

  return {
    state_delta: {
      member: {
        id:               updated.id,
        project_id:       updated.project_id,
        email:            updated.email,
        name:             updated.name,
        designation:      updated.designation,
        stakeholder_role: updated.stakeholder_role,
        authority_rank:   updated.authority_rank,
      },
    },
    affected_entities: { project_members: [updated.id], projects: [scope.project_id] },
  };
};

export const member_update_handler: EventHandlerDetails = {
  type:           'member.update',
  payload_schema,
  handler:        handler as any,
};
