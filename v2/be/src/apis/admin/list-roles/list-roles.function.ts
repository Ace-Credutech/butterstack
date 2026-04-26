import { Error_Interface } from '@config/interfaces/error.interface';
import { Role } from '@models/role.model';
import { User } from '@models/user.model';
import { list_roles_function_params, list_roles_function_return } from './list-roles.interface';

const count_users_per_role = async (): Promise<Record<string, number>> => {
  const rows = await User.findAll({ attributes: ['role_id'], raw: true });
  const counts: Record<string, number> = {};
  for (const r of rows as any[]) {
    if (!r.role_id) continue;
    counts[r.role_id] = (counts[r.role_id] ?? 0) + 1;
  }
  return counts;
};

const shape_role = (r: any, user_count: number) => ({
  id:           r.id,
  slug:         r.slug,
  name:         r.name,
  description:  r.description,
  permissions:  r.permissions_json ?? {},
  is_system:    r.is_system,
  user_count,
  created_at:   r.created_at,
  updated_at:   r.updated_at,
});

const list_roles_function = async (_data: list_roles_function_params): Promise<list_roles_function_return | Error_Interface> => {
  const roles  = await Role.findAll({ order: [['is_system', 'DESC'], ['name', 'ASC']] });
  const counts = await count_users_per_role();
  return {
    code:    200,
    message: 'roles',
    data: { items: roles.map(r => shape_role(r, counts[r.id] ?? 0)) },
  };
};

export default list_roles_function;
