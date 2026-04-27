import { Transaction } from 'sequelize';
import { Organisation } from '@models/organisation.model';
import { OrganisationMember } from '@models/organisation-member.model';
import { log } from '@setup/log';
import { unwrap_db_error } from '@setup/db-error';

const normalise_error = (error: unknown): Error => {
  const db = unwrap_db_error(error);
  if (db) return Object.assign(new Error(db.message), { status: db.code, details: db.details });
  if (error instanceof Error) return error;
  return new Error(String(error));
};

const personal_org_slug  = (user_id: string): string => `personal-${user_id}`;

const derive_org_name = (user_name: string): string => {
  try {
    const first = user_name.split(' ')[0] ?? user_name;
    return `${first}'s Organization`;
  } catch {
    return `${user_name}'s Organization`;
  }
};

export const find_personal_org = async (user_id: string, tx?: Transaction): Promise<Organisation | null> => {
  try {
    return Organisation.findOne({ where: { slug: personal_org_slug(user_id) }, transaction: tx });
  } catch (error) {
    log.warn('orgs.find_personal.failed', { user_id, error: String(normalise_error(error).message) });
    return null;
  }
};

const create_org_with_owner = async (user_id: string, name: string, tx?: Transaction): Promise<Organisation> => {
  try {
    const org = await Organisation.create({
      slug:       personal_org_slug(user_id),
      name,
      type:       'personal',
      created_by: user_id,
    }, { transaction: tx });
    await OrganisationMember.create({
      org_id:    org.id,
      user_id,
      role:      'owner',
      joined_at: new Date(),
    }, { transaction: tx });
    return org;
  } catch (error) {
    log.error('orgs.create_personal.failed', { user_id, error: String(normalise_error(error).message) });
    throw normalise_error(error);
  }
};

export const ensure_personal_org_for_user = async (
  user_id:   string,
  user_name: string,
  tx?:       Transaction,
): Promise<Organisation> => {
  try {
    const existing = await find_personal_org(user_id, tx);
    if (existing) return existing;
    return create_org_with_owner(user_id, derive_org_name(user_name), tx);
  } catch (error) {
    log.error('orgs.ensure_personal.failed', { user_id, error: String(normalise_error(error).message) });
    throw normalise_error(error);
  }
};

export const get_user_orgs = async (user_id: string): Promise<Organisation[]> => {
  try {
    const memberships = await OrganisationMember.findAll({
      where:   { user_id },
      include: [{ model: Organisation, as: 'org' }],
    });
    return memberships.map(m => (m as any).org).filter(Boolean);
  } catch (error) {
    log.error('orgs.get_user_orgs.failed', { user_id, error: String(normalise_error(error).message) });
    throw normalise_error(error);
  }
};
