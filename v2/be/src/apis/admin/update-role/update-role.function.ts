import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { Role } from '@models/role.model';
import { update_role_function_params, update_role_function_return } from './update-role.interface';

const find_target_role = (id: string, transaction: Transaction) => Role.findByPk(id, { transaction });

const guard_system_permissions_change = (target: Role, perms_provided: boolean, acting_user_role_slug: string) => {
  if (!perms_provided) return null;
  if (!target.is_system) return null;
  if (acting_user_role_slug === 'super_admin') return null;
  return { code: 403, message: 'System role permissions can only be changed by super_admin' };
};

const apply_role_changes = async (target: Role, fields: Partial<Role>, transaction: Transaction) => {
  if (Object.keys(fields).length === 0) return target;
  await target.update(fields, { transaction });
  return target;
};

const shape_role = (r: any) => ({
  id:          r.id,
  slug:        r.slug,
  name:        r.name,
  description: r.description,
  permissions: r.permissions_json ?? {},
  is_system:   r.is_system,
  created_at:  r.created_at,
  updated_at:  r.updated_at,
});

const update_role_function = async (data: update_role_function_params, transaction: Transaction): Promise<update_role_function_return | Error_Interface> => {
  const target = await find_target_role(data.id, transaction);
  if (!target) return { code: 404, message: `Role ${data.id} not found` };

  const acting_role_slug = data.user?.Role?.slug ?? data.user?.role?.slug ?? '';
  const guard = guard_system_permissions_change(target, data.permissions !== undefined, acting_role_slug);
  if (guard) return guard;

  const fields: Partial<Role> = {};
  if (data.name        !== undefined) (fields as any).name             = data.name;
  if (data.description !== undefined) (fields as any).description      = data.description;
  if (data.permissions !== undefined) (fields as any).permissions_json = data.permissions;

  const updated = await apply_role_changes(target, fields, transaction);
  return { code: 200, message: 'updated', data: shape_role(updated) };
};

export default update_role_function;
