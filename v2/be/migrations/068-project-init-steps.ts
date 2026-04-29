import { QueryInterface, DataTypes } from 'sequelize';

const STATUS_VALUES = ['in-progress', 'done', 'stale'];
const to_sql_list = (xs: string[]): string => xs.map(x => `'${x}'`).join(', ');

export const up = async (qi: QueryInterface) => {
  await qi.createTable('project_init_steps', {
    project_id: { type: DataTypes.UUID,    allowNull: false, references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE' },
    step:       { type: DataTypes.INTEGER, allowNull: false },
    status:     { type: DataTypes.STRING,  allowNull: false },
    updated_at: { type: DataTypes.DATE,    allowNull: false },
    updated_by: { type: DataTypes.UUID,    allowNull: true,  references: { model: 'users', key: 'id' } },
  });

  await qi.sequelize.query(`ALTER TABLE project_init_steps ADD PRIMARY KEY (project_id, step);`);
  await qi.sequelize.query(`ALTER TABLE project_init_steps ADD CONSTRAINT project_init_steps_step_check CHECK (step BETWEEN 1 AND 6);`);
  await qi.sequelize.query(`ALTER TABLE project_init_steps ADD CONSTRAINT project_init_steps_status_check CHECK (status IN (${to_sql_list(STATUS_VALUES)}));`);
};

export const down = async (qi: QueryInterface) => qi.dropTable('project_init_steps');
