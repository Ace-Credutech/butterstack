import { QueryInterface } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  // Drop any existing CHECK constraint on prompt_runs.status and add one that includes 'pending'
  await qi.sequelize.query(`
    DO $$
    DECLARE
      constraint_name text;
    BEGIN
      SELECT conname INTO constraint_name
      FROM pg_constraint
      WHERE conrelid = 'prompt_runs'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%status%';

      IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE prompt_runs DROP CONSTRAINT ' || quote_ident(constraint_name);
      END IF;
    END $$;
  `);

  await qi.sequelize.query(`
    ALTER TABLE prompt_runs
    ADD CONSTRAINT prompt_runs_status_check
    CHECK (status IN ('pending', 'success', 'error', 'timeout', 'filtered'));
  `);
};

export const down = async (qi: QueryInterface) => {
  await qi.sequelize.query(`ALTER TABLE prompt_runs DROP CONSTRAINT IF EXISTS prompt_runs_status_check;`);
  await qi.sequelize.query(`
    ALTER TABLE prompt_runs
    ADD CONSTRAINT prompt_runs_status_check
    CHECK (status IN ('success', 'error', 'timeout', 'filtered'));
  `);
};
