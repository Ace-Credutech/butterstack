import { z } from 'zod';
import { Op } from 'sequelize';
import { ProjectRole } from '@models/project-role.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  role_id:     z.string().uuid(),
  name:        z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

type Payload = z.infer<typeof payload_schema>;

const fetch_role = async (project_id: string, role_id: string, transaction: any) =>
  ProjectRole.findOne({ where: { id: role_id, project_id, deleted_at: null }, transaction });

const find_name_conflict = async (project_id: string, role_id: string, name: string, transaction: any) =>
  ProjectRole.findOne({
    where: {
      project_id,
      name:       { [Op.iLike]: name },
      id:         { [Op.ne]: role_id },
      deleted_at: null,
    },
    transaction,
  });

const apply_updates = async (
  role: ProjectRole,
  payload: Payload,
  user_id: string,
  transaction: any,
) => {
  const patch: Record<string, unknown> = { updated_by: user_id };
  if (payload.name !== undefined)        patch.name = payload.name;
  if (payload.description !== undefined) patch.description = payload.description;
  return role.update(patch as any, { transaction });
};

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const role = await fetch_role(scope.project_id, payload.role_id, transaction);
  if (!role) return { code: 404, message: 'Role not found' };

  if (payload.name) {
    const conflict = await find_name_conflict(scope.project_id, role.id, payload.name, transaction);
    if (conflict) return { code: 409, message: `Role "${payload.name}" already exists in this project` };
  }

  const updated = await apply_updates(role, payload, ctx.actor.id, transaction);

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'role.update',
    entity:      'ProjectRole',
    entity_id:   updated.id,
    description: `Updated role "${updated.name}"`,
  }, transaction);

  return {
    state_delta: {
      role: {
        id:          updated.id,
        project_id:  updated.project_id,
        name:        updated.name,
        description: updated.description,
      },
    },
    affected_entities: { project_roles: [updated.id], projects: [scope.project_id] },
  };
};

export const role_update_handler: EventHandlerDetails = {
  type:           'role.update',
  payload_schema,
  handler:        handler as any,
};
