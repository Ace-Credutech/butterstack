import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Session } from './session.model';
import { Project } from './project.model';
import { SessionParticipant } from './session-participant.model';

export type MessageRole = 'user' | 'ai' | 'system';

export class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
  declare id:               CreationOptional<string>;
  declare session_id:       ForeignKey<Session['id']>;
  declare project_id:       ForeignKey<Project['id']>;
  declare participant_id:   CreationOptional<ForeignKey<SessionParticipant['id']> | null>;
  declare role:             MessageRole;
  declare channel:          CreationOptional<string | null>;
  declare content:          string;
  declare reply_to:         CreationOptional<string | null>;
  declare attachments_json: CreationOptional<unknown | null>;
  declare created_at:       CreationOptional<Date>;
}

Message.init({
  id:               { type: DataTypes.UUID,       defaultValue: DataTypes.UUIDV4, primaryKey: true },
  session_id:       { type: DataTypes.UUID,       allowNull: false, references: { model: 'sessions', key: 'id' } },
  project_id:       { type: DataTypes.UUID,       allowNull: false, references: { model: 'projects', key: 'id' } },
  participant_id:   { type: DataTypes.UUID,       allowNull: true,  references: { model: 'session_participants', key: 'id' } },
  role:             { type: DataTypes.STRING(20), allowNull: false },
  channel:          { type: DataTypes.STRING(40), allowNull: true },
  content:          { type: DataTypes.TEXT,       allowNull: false },
  reply_to:         { type: DataTypes.UUID,       allowNull: true },
  attachments_json: { type: DataTypes.JSONB,      allowNull: true },
  created_at:       DataTypes.DATE,
}, { sequelize, tableName: 'messages', timestamps: true, updatedAt: false });

Message.belongsTo(Session,            { foreignKey: 'session_id',     as: 'session' });
Message.belongsTo(SessionParticipant, { foreignKey: 'participant_id', as: 'participant' });
Session.hasMany(Message,              { foreignKey: 'session_id',     as: 'messages' });
