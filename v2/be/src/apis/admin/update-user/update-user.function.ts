import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { User } from '@models/user.model';
import { Role } from '@models/role.model';
import { kc_update_user } from '@setup/keycloak-rest';
import { log } from '@setup/log';
import { update_user_function_params, update_user_function_return } from './update-user.interface';

const find_target_user = async (id: string, transaction: Transaction) => User.findByPk(id, { include: [{ model: Role }], transaction });

const find_role_by_slug = async (slug: string, transaction: Transaction) => Role.findOne({ where: { slug } as any, transaction });

const guard_self_demote = (acting_user: any, target: any, role_slug: string | undefined) => {
  if (!role_slug) return null;
  if (acting_user.id !== target.id) return null;
  const acting_role_slug = acting_user.Role?.slug ?? acting_user.role?.slug;
  if (acting_role_slug === 'super_admin' && role_slug !== 'super_admin') return { code: 400, message: 'Super admin cannot self-demote' };
  return null;
};

const guard_promote_super_admin = (acting_user: any, role_slug: string | undefined) => {
  if (role_slug !== 'super_admin') return null;
  const acting_role_slug = acting_user.Role?.slug ?? acting_user.role?.slug;
  if (acting_role_slug !== 'super_admin') return { code: 403, message: 'Only super admins can grant super_admin' };
  return null;
};

const compose_display_name = (first?: string, last?: string, fallback?: string): string | undefined => {
  if (first === undefined && last === undefined) return undefined;
  const composed = [first, last].filter(Boolean).join(' ').trim();
  return composed.length > 0 ? composed : fallback;
};

const sync_to_keycloak = async (target: User, first?: string, last?: string, is_active?: boolean): Promise<void> => {
  if (first === undefined && last === undefined && is_active === undefined) return;
  try { await kc_update_user(target.keycloak_sub, { first_name: first, last_name: last, enabled: is_active }); }
  catch (e: any) { log.warn('user_update.kc_sync_failed', { user_id: target.id, error: String(e?.message ?? e) }); }
};

const apply_changes = async (
  target: User,
  role_id: string | undefined,
  is_active: boolean | undefined,
  display_name: string | undefined,
  transaction: Transaction,
) => {
  const fields: Partial<User> = {};
  if (role_id      !== undefined) (fields as any).role_id   = role_id;
  if (is_active    !== undefined) (fields as any).is_active = is_active;
  if (display_name !== undefined) (fields as any).name      = display_name;
  if (Object.keys(fields).length === 0) return target;
  await target.update(fields, { transaction });
  return User.findByPk(target.id, { include: [{ model: Role }], transaction });
};

const shape_user = (u: any) => ({
  id:         u.id,
  email:      u.email,
  name:       u.name,
  is_active:  u.is_active,
  role:       u.Role ? { id: u.Role.id, slug: u.Role.slug, name: u.Role.name } : null,
  created_at: u.created_at,
});

const update_user_function = async (data: update_user_function_params, transaction: Transaction): Promise<update_user_function_return | Error_Interface> => {
  const target = await find_target_user(data.id, transaction);
  if (!target) return { code: 404, message: `User ${data.id} not found` };

  const self_demote_err = guard_self_demote(data.user, target, data.role_slug);
  if (self_demote_err) return self_demote_err;

  const promote_err = guard_promote_super_admin(data.user, data.role_slug);
  if (promote_err) return promote_err;

  let role_id: string | undefined;
  if (data.role_slug) {
    const role = await find_role_by_slug(data.role_slug, transaction);
    if (!role) return { code: 400, message: `Unknown role slug: ${data.role_slug}` };
    role_id = role.id;
  }

  const display_name = compose_display_name(data.first_name, data.last_name, target.name);
  await sync_to_keycloak(target, data.first_name, data.last_name, data.is_active);
  const updated = await apply_changes(target, role_id, data.is_active, display_name, transaction);
  return { code: 200, message: 'updated', data: shape_user(updated) };
};

export default update_user_function;
