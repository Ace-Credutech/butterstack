import { z } from 'zod';
import { ProjectRole } from '@models/project-role.model';
import { ProjectRolePermission } from '@models/project-role-permission.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

const payload_schema = z.object({
  role_id: z.string().uuid(),
});

type Payload = z.infer<typeof payload_schema>;

const fetch_role = async (project_id: string, role_id: string, transaction: any) =>
  ProjectRole.findOne({ where: { id: role_id, project_id, deleted_at: null }, transaction });

const cascade_delete_permissions = async (role_id: string, transaction: any) =>
  ProjectRolePermission.destroy({ where: { role_id }, transaction });

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const role = await fetch_role(scope.project_id, payload.role_id, transaction);
  if (!role) return { code: 404, message: 'Role not found' };

  await cascade_delete_permissions(role.id, transaction);
  await role.destroy({ transaction });

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'role.delete',
    entity:      'ProjectRole',
    entity_id:   role.id,
    description: `Deleted role "${role.name}"`,
  }, transaction);

  return {
    state_delta: {
      role: { id: role.id, deleted: true },
    },
    affected_entities: { project_roles: [role.id], projects: [scope.project_id] },
  };
};

export const role_delete_handler: EventHandlerDetails = {
  type:           'role.delete',
  payload_schema,
  handler:        handler as any,
};
