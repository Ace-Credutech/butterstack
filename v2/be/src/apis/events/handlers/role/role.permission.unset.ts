import { z } from 'zod';
import { ProjectRole } from '@models/project-role.model';
import { ProjectRolePermission } from '@models/project-role-permission.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  role_id:        z.string().uuid(),
  permission_key: z.string().trim().min(1).max(160),
  feature_id:     z.string().uuid().nullable().optional(),
});

type Payload = z.infer<typeof payload_schema>;

const fetch_role = async (project_id: string, role_id: string, transaction: any) =>
  ProjectRole.findOne({ where: { id: role_id, project_id, deleted_at: null }, transaction });

const remove_cell = async (
  args: { role_id: string; permission_key: string; feature_id: string | null },
  transaction: any,
) =>
  ProjectRolePermission.destroy({
    where: {
      role_id:        args.role_id,
      permission_key: args.permission_key,
      feature_id:     args.feature_id,
    },
    transaction,
  });

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const role = await fetch_role(scope.project_id, payload.role_id, transaction);
  if (!role) return { code: 404, message: 'Role not found' };

  const removed = await remove_cell({
    role_id:        payload.role_id,
    permission_key: payload.permission_key,
    feature_id:     payload.feature_id ?? null,
  }, transaction);

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'role.permission.unset',
    entity:      'ProjectRolePermission',
    entity_id:   `${role.id}:${payload.permission_key}`,
    description: `Unset ${role.name}.${payload.permission_key}${payload.feature_id ? `@${payload.feature_id}` : ''} (${removed} row(s))`,
  }, transaction);

  return {
    state_delta: {
      role_permission_unset: {
        role_id:        role.id,
        permission_key: payload.permission_key,
        feature_id:     payload.feature_id ?? null,
        removed,
      },
    },
    affected_entities: { project_roles: [role.id] },
  };
};

export const role_permission_unset_handler: EventHandlerDetails = {
  type:           'role.permission.unset',
  payload_schema,
  handler:        handler as any,
};
