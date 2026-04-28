import { QueryInterface } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  // prompt_runs: add 'cancelled' to status constraint
  await qi.sequelize.query(`ALTER TABLE prompt_runs DROP CONSTRAINT IF EXISTS prompt_runs_status_check;`);
  await qi.sequelize.query(`
    ALTER TABLE prompt_runs ADD CONSTRAINT prompt_runs_status_check
    CHECK (status IN ('pending', 'success', 'error', 'timeout', 'filtered', 'cancelled'));
  `);

  // documents: add 'cancelled' to parse_status constraint (drop old one if any)
  await qi.sequelize.query(`
    DO $$
    DECLARE cname text;
    BEGIN
      SELECT conname INTO cname FROM pg_constraint
      WHERE conrelid = 'documents'::regclass AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%parse_status%';
      IF cname IS NOT NULL THEN
        EXECUTE 'ALTER TABLE documents DROP CONSTRAINT ' || quote_ident(cname);
      END IF;
    END $$;
  `);
  await qi.sequelize.query(`
    ALTER TABLE documents ADD CONSTRAINT documents_parse_status_check
    CHECK (parse_status IN ('pending', 'parsed', 'failed', 'cancelled'));
  `);
};

export const down = async (qi: QueryInterface) => {
  await qi.sequelize.query(`ALTER TABLE prompt_runs DROP CONSTRAINT IF EXISTS prompt_runs_status_check;`);
  await qi.sequelize.query(`
    ALTER TABLE prompt_runs ADD CONSTRAINT prompt_runs_status_check
    CHECK (status IN ('pending', 'success', 'error', 'timeout', 'filtered'));
  `);
  await qi.sequelize.query(`ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_parse_status_check;`);
  await qi.sequelize.query(`
    ALTER TABLE documents ADD CONSTRAINT documents_parse_status_check
    CHECK (parse_status IN ('pending', 'parsed', 'failed'));
  `);
};
