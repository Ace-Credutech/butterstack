import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from './sequelize';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname_esm = path.dirname(fileURLToPath(import.meta.url));
const migrations_glob = path.resolve(__dirname_esm, '..', '..', 'migrations', '*.ts');

export const migrator = new Umzug({
  migrations: {
    glob: migrations_glob,
    resolve: ({ name, path: p, context }) => {
      const mod_promise = import(p!);
      return {
        name,
        up:   async () => { const m = await mod_promise; return m.up(context); },
        down: async () => { const m = await mod_promise; return m.down(context); },
      };
    },
  },
  context:   sequelize.getQueryInterface(),
  storage:   new SequelizeStorage({ sequelize }),
  logger:    console,
});

export type Migration = typeof migrator._types.migration;
