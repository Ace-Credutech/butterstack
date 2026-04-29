import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Session } from './session.model';
import { User } from './user.model';
import { ProjectMember } from './project-member.model';

export type SessionParticipantKind = 'human' | 'ai' | 'system';

export class SessionParticipant extends Model<InferAttributes<SessionParticipant>, InferCreationAttributes<SessionParticipant>> {
  declare id:           CreationOptional<string>;
  declare session_id:   ForeignKey<Session['id']>;
  declare user_id:      CreationOptional<ForeignKey<User['id']> | null>;
  declare member_id:    CreationOptional<ForeignKey<ProjectMember['id']> | null>;
  declare kind:         SessionParticipantKind;
  declare display_name: string;
  declare joined_at:    CreationOptional<Date>;
  declare left_at:      CreationOptional<Date | null>;
}

SessionParticipant.init({
  id:           { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
  session_id:   { type: DataTypes.UUID,        allowNull: false, references: { model: 'sessions',         key: 'id' } },
  user_id:      { type: DataTypes.UUID,        allowNull: true,  references: { model: 'users',            key: 'id' } },
  member_id:    { type: DataTypes.UUID,        allowNull: true,  references: { model: 'project_members',  key: 'id' } },
  kind:         { type: DataTypes.STRING(20),  allowNull: false },
  display_name: { type: DataTypes.STRING(240), allowNull: false },
  joined_at:    DataTypes.DATE,
  left_at:      DataTypes.DATE,
}, { sequelize, tableName: 'session_participants', timestamps: false });

SessionParticipant.belongsTo(Session,       { foreignKey: 'session_id', as: 'session' });
SessionParticipant.belongsTo(User,          { foreignKey: 'user_id',    as: 'user' });
SessionParticipant.belongsTo(ProjectMember, { foreignKey: 'member_id',  as: 'member' });
Session.hasMany(SessionParticipant,         { foreignKey: 'session_id', as: 'participants' });
