import { Sequelize } from 'sequelize';
import { env } from '@src/env';
import { make_sequelize_logger } from './slow-query-logger';

export type DbName = 'primary' | 'analytics' | 'audit';

const url_for = (name: DbName): string => {
  if (name === 'primary')   return env.DATABASE_URL_PRIMARY;
  if (name === 'analytics') return env.DATABASE_URL_ANALYTICS || env.DATABASE_URL_PRIMARY;
  return env.DATABASE_URL_AUDIT || env.DATABASE_URL_PRIMARY;
};

const build_client = (name: DbName): Sequelize => new Sequelize(url_for(name), {
  dialect:   'postgres',
  logging:   make_sequelize_logger(name),
  benchmark: true,
  define: {
    paranoid:        true,
    underscored:     true,
    freezeTableName: false,
    timestamps:      true,
  },
  pool: { max: 10, min: 0, idle: 10000 },
});

const clients = new Map<DbName, Sequelize>();

export const db = (name: DbName = 'primary'): Sequelize => {
  const cached = clients.get(name);
  if (cached) return cached;
  const client = build_client(name);
  clients.set(name, client);
  return client;
};

export const sequelize = db('primary');

export const close_all_dbs = async (): Promise<void> => {
  for (const client of clients.values()) await client.close();
  clients.clear();
};
