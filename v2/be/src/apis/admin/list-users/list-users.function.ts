import { Op, WhereOptions } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { User } from '@models/user.model';
import { Role } from '@models/role.model';
import { list_users_function_params, list_users_function_return } from './list-users.interface';

const where_search = (q?: string): WhereOptions => {
  if (!q) return {};
  const term = `%${q.toLowerCase()}%`;
  return { [Op.or]: [
    { email: { [Op.iLike]: term } },
    { name:  { [Op.iLike]: term } },
  ] } as any;
};

const where_active = (flag?: 'true' | 'false'): WhereOptions => {
  if (flag === undefined) return {};
  return { is_active: flag === 'true' };
};

const role_filter_clause = async (slug?: string): Promise<WhereOptions> => {
  if (!slug) return {};
  const role = await Role.findOne({ where: { slug } as any });
  if (!role) return { role_id: '00000000-0000-0000-0000-000000000000' };
  return { role_id: role.id };
};

const shape_user = (u: any) => ({
  id:        u.id,
  email:     u.email,
  name:      u.name,
  is_active: u.is_active,
  role:      u.role ? { id: u.role.id, slug: u.role.slug, name: u.role.name } : null,
  created_at: u.created_at,
});

const list_users_function = async (data: list_users_function_params): Promise<list_users_function_return | Error_Interface> => {
  const where = {
    ...where_search(data.q),
    ...where_active(data.is_active),
    ...(await role_filter_clause(data.role_slug)),
  };

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [{ model: Role, as: 'role' }],
    order:   [[data.sort, data.dir]],
    limit:   data.size,
    offset:  (data.page - 1) * data.size,
  });

  return {
    code:    200,
    message: 'users',
    data: {
      items: rows.map(shape_user),
      total: count,
      page:  data.page,
      size:  data.size,
    },
  };
};

export default list_users_function;
