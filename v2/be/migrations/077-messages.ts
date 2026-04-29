import { QueryInterface, DataTypes } from 'sequelize';

const ROLES = ['user', 'ai', 'system'];
const to_sql_list = (xs: string[]): string => xs.map(x => `'${x}'`).join(', ');

export const up = async (qi: QueryInterface) => {
  await qi.createTable('messages', {
    id:               { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    session_id:       { type: DataTypes.UUID, allowNull: false, references: { model: 'sessions', key: 'id' }, onDelete: 'CASCADE' },
    project_id:       { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE' },
    participant_id:   { type: DataTypes.UUID, allowNull: true,  references: { model: 'session_participants', key: 'id' } },
    role:             { type: DataTypes.STRING(20), allowNull: false },
    channel:          { type: DataTypes.STRING(40), allowNull: true },
    content:          { type: DataTypes.TEXT, allowNull: false },
    reply_to:         { type: DataTypes.UUID, allowNull: true },
    attachments_json: { type: DataTypes.JSONB, allowNull: true },
    created_at:       { type: DataTypes.DATE, allowNull: false },
  });

  await qi.sequelize.query(`ALTER TABLE messages ADD CONSTRAINT messages_role_check CHECK (role IN (${to_sql_list(ROLES)}));`);
  await qi.sequelize.query(`ALTER TABLE messages ADD CONSTRAINT messages_reply_to_fk FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL;`);
  await qi.sequelize.query(`CREATE INDEX messages_session_created_idx ON messages (session_id, created_at);`);
  await qi.sequelize.query(`CREATE INDEX messages_project_id_idx       ON messages (project_id);`);
};

export const down = async (qi: QueryInterface) => qi.dropTable('messages');
