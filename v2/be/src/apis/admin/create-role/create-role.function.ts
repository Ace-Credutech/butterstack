import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { Role } from '@models/role.model';
import { create_role_function_params, create_role_function_return } from './create-role.interface';

const slug_taken = async (slug: string, transaction: Transaction): Promise<boolean> => {
  const existing = await Role.findOne({ where: { slug } as any, transaction });
  return !!existing;
};

const shape_role = (r: any) => ({
  id:           r.id,
  slug:         r.slug,
  name:         r.name,
  description:  r.description,
  permissions:  r.permissions_json ?? {},
  is_system:    r.is_system,
  created_at:   r.created_at,
  updated_at:   r.updated_at,
});

const create_role_function = async (data: create_role_function_params, transaction: Transaction): Promise<create_role_function_return | Error_Interface> => {
  if (await slug_taken(data.slug, transaction)) return { code: 409, message: `Role slug "${data.slug}" already exists` };

  const role = await Role.create({
    slug:             data.slug,
    name:             data.name,
    description:      data.description ?? null,
    permissions_json: data.permissions,
    is_system:        false,
  } as any, { transaction });

  return { code: 201, message: 'created', data: shape_role(role) };
};

export default create_role_function;
