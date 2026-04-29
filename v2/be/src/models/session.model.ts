import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Project } from './project.model';
import { User } from './user.model';

export type SessionKind = 'clarification' | 'quiz' | 'review';

export class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
  declare id:         CreationOptional<string>;
  declare project_id: ForeignKey<Project['id']>;
  declare kind:       SessionKind;
  declare title:      CreationOptional<string | null>;
  declare started_by: CreationOptional<ForeignKey<User['id']> | null>;
  declare ended_at:   CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Session.init({
  id:         { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID,        allowNull: false, references: { model: 'projects', key: 'id' } },
  kind:       { type: DataTypes.STRING(40),  allowNull: false },
  title:      { type: DataTypes.STRING(240), allowNull: true },
  started_by: { type: DataTypes.UUID,        allowNull: true,  references: { model: 'users', key: 'id' } },
  ended_at:   { type: DataTypes.DATE,        allowNull: true },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
}, { sequelize, tableName: 'sessions' });

Session.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Session.belongsTo(User,    { foreignKey: 'started_by', as: 'starter' });
Project.hasMany(Session,   { foreignKey: 'project_id', as: 'sessions' });
