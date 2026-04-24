import { Transaction } from 'sequelize';
import { User } from '@models/user.model';
import { Role } from '@models/role.model';
import { KeycloakClaims } from './jwt-verify';
import { log } from './log';

const derive_name = (claims: KeycloakClaims): string =>
  claims.name ?? claims.preferred_username ?? claims.email ?? claims.sub;

const build_creation_fields = (claims: KeycloakClaims) => ({
  id:           claims.sub,
  email:        claims.email ?? `${claims.sub}@unknown`,
  name:         derive_name(claims),
  keycloak_sub: claims.sub,
  role_id:      null,
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
    await User.create(build_creation_fields(claims) as any, { transaction });
    return User.findByPk(claims.sub, { include: [{ model: Role }], transaction });
  } catch (e: any) {
    log.warn('user_upsert.failed', { sub: claims.sub, error: String(e?.message ?? e) });
    return null;
  }
};
