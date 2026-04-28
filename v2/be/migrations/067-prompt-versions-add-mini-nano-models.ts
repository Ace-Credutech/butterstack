import { QueryInterface } from 'sequelize';

// Add gpt-5-mini, gpt-4.1-mini, gpt-4.1-nano to the prompt_versions.model CHECK constraint
// so admin UI can save these smaller/faster model variants.

const NEW_MODELS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'gpt-5',
  'gpt-5-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
];

const OLD_MODELS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'gpt-5',
  'gpt-4.1',
];

const to_sql_list = (xs: string[]): string => xs.map(x => `'${x}'`).join(', ');

export const up = async (qi: QueryInterface) => {
  await qi.sequelize.query(`ALTER TABLE prompt_versions DROP CONSTRAINT IF EXISTS prompt_versions_model_check;`);
  await qi.sequelize.query(`
    ALTER TABLE prompt_versions ADD CONSTRAINT prompt_versions_model_check
    CHECK (model IN (${to_sql_list(NEW_MODELS)}));
  `);
};

export const down = async (qi: QueryInterface) => {
  await qi.sequelize.query(`ALTER TABLE prompt_versions DROP CONSTRAINT IF EXISTS prompt_versions_model_check;`);
  await qi.sequelize.query(`
    ALTER TABLE prompt_versions ADD CONSTRAINT prompt_versions_model_check
    CHECK (model IN (${to_sql_list(OLD_MODELS)}));
  `);
};
