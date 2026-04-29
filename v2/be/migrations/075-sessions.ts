import { QueryInterface, DataTypes } from 'sequelize';

const KINDS = ['clarification', 'quiz', 'review'];
const to_sql_list = (xs: string[]): string => xs.map(x => `'${x}'`).join(', ');

export const up = async (qi: QueryInterface) => {
  await qi.createTable('sessions', {
    id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    project_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE' },
    kind:       { type: DataTypes.STRING(40), allowNull: false },
    title:      { type: DataTypes.STRING(240), allowNull: true },
    started_by: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    ended_at:   { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.sequelize.query(`ALTER TABLE sessions ADD CONSTRAINT sessions_kind_check CHECK (kind IN (${to_sql_list(KINDS)}));`);
  await qi.sequelize.query(`CREATE INDEX sessions_project_id_idx ON sessions (project_id);`);
  await qi.sequelize.query(`CREATE INDEX sessions_project_kind_idx ON sessions (project_id, kind);`);
};

export const down = async (qi: QueryInterface) => qi.dropTable('sessions');
