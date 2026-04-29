import { QueryInterface, DataTypes } from 'sequelize';

const STATUS_VALUES = ['draft', 'active', 'archived'];
const to_sql_list = (xs: string[]): string => xs.map(x => `'${x}'`).join(', ');

export const up = async (qi: QueryInterface) => {
  await qi.addColumn('projects', 'status', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'draft',
  });
  await qi.sequelize.query(`ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN (${to_sql_list(STATUS_VALUES)}));`);
  await qi.addIndex('projects', ['status']);
};

export const down = async (qi: QueryInterface) => {
  await qi.removeIndex('projects', ['status']);
  await qi.sequelize.query(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;`);
  await qi.removeColumn('projects', 'status');
};
