import { z } from 'zod';
import { ProjectRole } from '@models/project-role.model';
import { ProjectRolePermission } from '@models/project-role-permission.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

// D-5 — set/upsert a single (role × permission_key × feature_id?) cell.
// feature_id is optional until Phase F ships features; pre-Phase F all cells
// live with feature_id = NULL.

const payload_schema = z.object({
  role_id:        z.string().uuid(),
  permission_key: z.string().trim().min(1).max(160),
  feature_id:     z.string().uuid().nullable().optional(),
  allow:          z.boolean(),
});

type Payload = z.infer<typeof payload_schema>;

const fetch_role = async (project_id: string, role_id: string, transaction: any) =>
  ProjectRole.findOne({ where: { id: role_id, project_id, deleted_at: null }, transaction });

const find_existing_cell = async (
  args: { role_id: string; permission_key: string; feature_id: string | null },
  transaction: any,
) =>
  ProjectRolePermission.findOne({
    where: {
      role_id:        args.role_id,
      permission_key: args.permission_key,
      feature_id:     args.feature_id,
    },
    transaction,
  });

const upsert_cell = async (
  args: { project_id: string; role_id: string; permission_key: string; feature_id: string | null; allow: boolean; user_id: string },
  transaction: any,
) => {
  const existing = await find_existing_cell(args, transaction);
  if (existing) {
    await existing.update({ allow: args.allow, updated_by: args.user_id }, { transaction });
    return existing;
  }
  return ProjectRolePermission.create({
    project_id:     args.project_id,
    role_id:        args.role_id,
    permission_key: args.permission_key,
    feature_id:     args.feature_id,
    allow:          args.allow,
    created_by:     args.user_id,
    updated_by:     args.user_id,
  } as any, { transaction });
};

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const role = await fetch_role(scope.project_id, payload.role_id, transaction);
  if (!role) return { code: 404, message: 'Role not found' };

  const cell = await upsert_cell({
    project_id:     scope.project_id,
    role_id:        payload.role_id,
    permission_key: payload.permission_key,
    feature_id:     payload.feature_id ?? null,
    allow:          payload.allow,
    user_id:        ctx.actor.id,
  }, transaction);

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'role.permission.set',
    entity:      'ProjectRolePermission',
    entity_id:   cell.id,
    description: `Set ${role.name}.${payload.permission_key}${payload.feature_id ? `@${payload.feature_id}` : ''} = ${payload.allow}`,
  }, transaction);

  return {
    state_delta: {
      role_permission: {
        id:             cell.id,
        role_id:        cell.role_id,
        permission_key: cell.permission_key,
        feature_id:     cell.feature_id,
        allow:          cell.allow,
      },
    },
    affected_entities: { project_role_permissions: [cell.id], project_roles: [role.id] },
  };
};

export const role_permission_set_handler: EventHandlerDetails = {
  type:           'role.permission.set',
  payload_schema,
  handler:        handler as any,
};
