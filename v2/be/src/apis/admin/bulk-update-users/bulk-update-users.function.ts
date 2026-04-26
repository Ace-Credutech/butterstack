import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { User } from '@models/user.model';
import { Role } from '@models/role.model';
import { kc_create_user } from '@setup/keycloak-rest';
import { log } from '@setup/log';
import { bulk_update_users_function_params, bulk_update_users_function_return, BulkUpsertOp } from './bulk-update-users.interface';

type RowResult = { email: string; ok: boolean; action?: 'updated' | 'created'; error?: string };

const default_temp_password = (email: string): string => `Temp!${Buffer.from(email).toString('base64').slice(0, 16)}A1`;

const split_name = (full?: string, first?: string, last?: string): { name: string; first_name: string; last_name: string } => {
  if (first || last) return { name: [first, last].filter(Boolean).join(' '), first_name: first ?? '', last_name: last ?? '' };
  if (full) {
    const parts = full.trim().split(/\s+/);
    return { name: full, first_name: parts[0] ?? '', last_name: parts.slice(1).join(' ') };
  }
  return { name: '', first_name: '', last_name: '' };
};

const find_role_map = async (transaction: Transaction): Promise<Map<string, string>> => {
  const roles = await Role.findAll({ transaction });
  return new Map(roles.map(r => [r.slug, r.id]));
};

const find_user_by_email = (email: string, transaction: Transaction) => User.findOne({ where: { email } as any, transaction });

const create_user_in_keycloak = async (op: BulkUpsertOp): Promise<string> => {
  const names    = split_name(op.name, op.first_name, op.last_name);
  const password = op.password || default_temp_password(op.email);
  const created  = await kc_create_user({
    email:      op.email,
    password,
    first_name: names.first_name || op.email.split('@')[0],
    last_name:  names.last_name,
  });
  return created.id;
};

const seed_db_user_row = async (id: string, op: BulkUpsertOp, role_id: string | undefined, transaction: Transaction): Promise<User> => {
  const names = split_name(op.name, op.first_name, op.last_name);
  return User.create({
    id,
    email:        op.email,
    name:         names.name || op.email.split('@')[0],
    keycloak_sub: id,
    role_id:      role_id ?? null,
    is_active:    op.is_active ?? true,
  } as any, { transaction });
};

const update_user_fields = async (target: User, op: BulkUpsertOp, role_id: string | undefined, transaction: Transaction): Promise<void> => {
  const fields: Partial<User> = {};
  if (role_id     !== undefined) (fields as any).role_id   = role_id;
  if (op.is_active !== undefined) (fields as any).is_active = op.is_active;
  if (op.name)                    (fields as any).name      = op.name;
  if (Object.keys(fields).length === 0) return;
  await target.update(fields, { transaction });
};

const apply_one = async (op: BulkUpsertOp, role_map: Map<string, string>, transaction: Transaction): Promise<RowResult> => {
  let role_id: string | undefined;
  if (op.role_slug) {
    const r = role_map.get(op.role_slug);
    if (!r) return { email: op.email, ok: false, error: `unknown role ${op.role_slug}` };
    role_id = r;
  }

  const existing = await find_user_by_email(op.email, transaction);
  if (existing) {
    await update_user_fields(existing, op, role_id, transaction);
    return { email: op.email, ok: true, action: 'updated' };
  }

  try {
    const new_id = await create_user_in_keycloak(op);
    await seed_db_user_row(new_id, op, role_id, transaction);
    return { email: op.email, ok: true, action: 'created' };
  } catch (e: any) {
    log.warn('bulk_upsert.create_failed', { email: op.email, error: String(e?.message ?? e) });
    return { email: op.email, ok: false, error: e?.message ?? 'create failed' };
  }
};

const bulk_update_users_function = async (data: bulk_update_users_function_params, transaction: Transaction): Promise<bulk_update_users_function_return | Error_Interface> => {
  const role_map = await find_role_map(transaction);
  const results: RowResult[] = [];
  for (const op of data.updates) results.push(await apply_one(op, role_map, transaction));

  const success = results.filter(r => r.ok).length;
  const created = results.filter(r => r.ok && r.action === 'created').length;
  const updated = results.filter(r => r.ok && r.action === 'updated').length;
  const failed  = results.filter(r => !r.ok);

  return {
    code:    200,
    message: `Bulk upsert finished: ${updated} updated, ${created} created, ${failed.length} failed`,
    data: { success, updated, created, failed },
  };
};

export default bulk_update_users_function;
