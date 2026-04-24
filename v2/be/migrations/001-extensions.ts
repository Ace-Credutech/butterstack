import { QueryInterface } from 'sequelize';

export const up = async (qi: QueryInterface) => {
  await qi.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await qi.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');
};

export const down = async (qi: QueryInterface) => {
  await qi.sequelize.query('DROP EXTENSION IF EXISTS "pg_trgm";');
  await qi.sequelize.query('DROP EXTENSION IF EXISTS "uuid-ossp";');
};
