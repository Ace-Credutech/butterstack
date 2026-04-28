import { QueryInterface } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  // Delete personal-{uuid} slug orgs for users who already had a personal org with a different slug.
  // The older custom slugs (akash, akashs25, bhavesh3, pratiksha) are the real ones — keep those.
  await qi.sequelize.query(`
    DELETE FROM organisations
    WHERE slug ~ '^personal-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND type = 'personal'
      AND created_by IN (
        SELECT created_by FROM organisations
        WHERE type = 'personal'
          AND slug !~ '^personal-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
  `);
};

export const down = async (_qi: QueryInterface) => {
  // Cannot safely recreate deleted orgs
};
