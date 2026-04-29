import { QueryInterface, DataTypes } from 'sequelize';

const KINDS = ['human', 'ai', 'system'];
const to_sql_list = (xs: string[]): string => xs.map(x => `'${x}'`).join(', ');

export const up = async (qi: QueryInterface) => {
  await qi.createTable('session_participants', {
    id:           { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    session_id:   { type: DataTypes.UUID, allowNull: false, references: { model: 'sessions', key: 'id' }, onDelete: 'CASCADE' },
    user_id:      { type: DataTypes.UUID, allowNull: true,  references: { model: 'users',    key: 'id' } },
    member_id:    { type: DataTypes.UUID, allowNull: true,  references: { model: 'project_members', key: 'id' } },
    kind:         { type: DataTypes.STRING(20),  allowNull: false },
    display_name: { type: DataTypes.STRING(240), allowNull: false },
    joined_at:    { type: DataTypes.DATE, allowNull: false },
    left_at:      { type: DataTypes.DATE, allowNull: true },
  });

  await qi.sequelize.query(`ALTER TABLE session_participants ADD CONSTRAINT session_participants_kind_check CHECK (kind IN (${to_sql_list(KINDS)}));`);
  await qi.sequelize.query(`CREATE INDEX session_participants_session_id_idx ON session_participants (session_id);`);
};

export const down = async (qi: QueryInterface) => qi.dropTable('session_participants');
