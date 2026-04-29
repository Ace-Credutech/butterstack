import { z } from 'zod';
import { Op } from 'sequelize';
import { ProjectRole } from '@models/project-role.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  name:        z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
});

type Payload = z.infer<typeof payload_schema>;

const find_existing_role = async (project_id: string, name: string, transaction: any) =>
  ProjectRole.findOne({
    where: {
      project_id,
      name: { [Op.iLike]: name },
      deleted_at: null,
    },
    transaction,
  });

const create_role = async (
  args: { project_id: string; user_id: string; name: string; description?: string | null },
  transaction: any,
) => ProjectRole.create({
  project_id:  args.project_id,
  name:        args.name,
  description: args.description ?? null,
  created_by:  args.user_id,
  updated_by:  args.user_id,
} as any, { transaction });

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const existing = await find_existing_role(scope.project_id, payload.name, transaction);
  if (existing) return { code: 409, message: `Role "${payload.name}" already exists in this project` };

  const role = await create_role({
    project_id:  scope.project_id,
    user_id:     ctx.actor.id,
    name:        payload.name,
    description: payload.description ?? null,
  }, transaction);

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'role.create',
    entity:      'ProjectRole',
    entity_id:   role.id,
    description: `Created role "${role.name}"`,
  }, transaction);

  return {
    state_delta: {
      role: {
        id:          role.id,
        project_id:  role.project_id,
        name:        role.name,
        description: role.description,
      },
    },
    affected_entities: { project_roles: [role.id], projects: [scope.project_id] },
  };
};

export const role_create_handler: EventHandlerDetails = {
  type:           'role.create',
  payload_schema,
  handler:        handler as any,
};
