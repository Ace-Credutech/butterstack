import { Transaction } from 'sequelize';
import { User } from '@models/user.model';
import { Role } from '@models/role.model';
import { KeycloakClaims } from './jwt-verify';
import { log } from './log';

const derive_name = (claims: KeycloakClaims): string =>
  claims.name ?? claims.preferred_username ?? claims.email ?? claims.sub;

const is_first_user = async (transaction?: Transaction): Promise<boolean> => {
  const count = await User.count({ transaction });
  return count === 0;
};

const role_id_for_slug = async (slug: string, transaction?: Transaction): Promise<string | null> => {
  const role = await Role.findOne({ where: { slug } as any, transaction });
  return role?.id ?? null;
};

const initial_role_for_new_user = async (transaction?: Transaction): Promise<string | null> => {
  if (await is_first_user(transaction)) return role_id_for_slug('product_manager', transaction);
  return role_id_for_slug('member', transaction);
};

const build_creation_fields = async (claims: KeycloakClaims, transaction?: Transaction) => ({
  id:           claims.sub,
  email:        claims.email ?? `${claims.sub}@unknown`,
  name:         derive_name(claims),
  keycloak_sub: claims.sub,
  role_id:      await initial_role_for_new_user(transaction),
  is_active:    true,
});

const sync_if_changed = async (user: User, claims: KeycloakClaims, transaction?: Transaction) => {
  const email = claims.email ?? user.email;
  const name  = derive_name(claims);
  if (user.email === email && user.name === name) return user;
  await user.update({ email, name }, { transaction });
  return user;
};

export const ensure_user_from_claims = async (claims: KeycloakClaims, transaction?: Transaction): Promise<User | null> => {
  try {
    const existing = await User.findByPk(claims.sub, { include: [{ model: Role }], transaction });
    if (existing) { await sync_if_changed(existing, claims, transaction); return existing; }
    const fields = await build_creation_fields(claims, transaction);
    await User.create(fields as any, { transaction });
    return User.findByPk(claims.sub, { include: [{ model: Role }], transaction });
  } catch (e: any) {
    log.warn('user_upsert.failed', { sub: claims.sub, error: String(e?.message ?? e) });
    return null;
  }
};
