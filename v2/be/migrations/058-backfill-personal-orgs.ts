import { QueryInterface } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.sequelize.query(`
    INSERT INTO organisations (id, slug, name, type, created_by, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      'personal-' || u.id,
      split_part(u.name, ' ', 1) || '''s Organization',
      'personal',
      u.id,
      NOW(),
      NOW()
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM organisations o WHERE o.slug = 'personal-' || u.id
    )
  `);

  await qi.sequelize.query(`
    INSERT INTO organisation_members (org_id, user_id, role, joined_at, created_at, updated_at)
    SELECT
      o.id,
      u.id,
      'owner',
      NOW(),
      NOW(),
      NOW()
    FROM users u
    JOIN organisations o ON o.slug = 'personal-' || u.id
    WHERE NOT EXISTS (
      SELECT 1 FROM organisation_members m WHERE m.org_id = o.id AND m.user_id = u.id
    )
  `);
};

export const down = async (qi: QueryInterface) => {
  await qi.sequelize.query(`
    DELETE FROM organisations
    WHERE type = 'personal'
      AND slug LIKE 'personal-%'
  `);
};
