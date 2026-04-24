import { z } from 'zod';
import { ProjectMember } from '@models/project-member.model';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  name:             z.string().min(1),
  email:            z.string().email(),
  designation:      z.string().min(1),
  stakeholder_role: z.enum(['decider', 'reviewer', 'contributor', 'observer']),
  authority_rank:   z.number().int().min(1),
});

type Payload = z.infer<typeof payload_schema>;

const handler: EventHandler<Payload> = async (payload, scope, _ctx, transaction) => {
  const existing = await ProjectMember.findOne({ where: { project_id: scope.project_id, email: payload.email }, transaction });
  if (existing) return { code: 409, message: `Member with email ${payload.email} already exists in this project` };
  const member = await ProjectMember.create({
    project_id:       scope.project_id,
    user_id:          null,
    email:            payload.email,
    name:             payload.name,
    designation:      payload.designation,
    stakeholder_role: payload.stakeholder_role,
    authority_rank:   payload.authority_rank,
  } as any, { transaction });
  return {
    state_delta:       { member: { id: member.id, email: member.email, name: member.name } },
    affected_entities: { project_members: [member.id], projects: [scope.project_id] },
  };
};

export const member_add_handler: EventHandlerDetails = {
  type:           'member.add',
  payload_schema,
  handler:        handler as any,
};
