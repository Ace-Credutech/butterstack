import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Project } from './project.model';
import { User } from './user.model';

export type StakeholderRole = 'decider' | 'reviewer' | 'contributor' | 'observer';

export class ProjectMember extends Model<InferAttributes<ProjectMember>, InferCreationAttributes<ProjectMember>> {
  declare id:               CreationOptional<string>;
  declare project_id:       ForeignKey<Project['id']>;
  declare user_id:          ForeignKey<User['id']> | null;
  declare invited_by:       CreationOptional<ForeignKey<User['id']> | null>;
  declare email:            string;
  declare name:             string;
  declare designation:      string;
  declare stakeholder_role: StakeholderRole;
  declare authority_rank:   number;
  declare created_at:       CreationOptional<Date>;
  declare updated_at:       CreationOptional<Date>;
  declare deleted_at:       CreationOptional<Date | null>;
}

ProjectMember.init({
  id:               { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id:       { type: DataTypes.UUID,    allowNull: false, references: { model: 'projects', key: 'id' } },
  user_id:          { type: DataTypes.UUID,    allowNull: true,  references: { model: 'users',    key: 'id' } },
  invited_by:       { type: DataTypes.UUID,    allowNull: true,  references: { model: 'users',    key: 'id' } },
  email:            { type: DataTypes.STRING,  allowNull: false },
  name:             { type: DataTypes.STRING,  allowNull: false },
  designation:      { type: DataTypes.STRING,  allowNull: false },
  stakeholder_role: { type: DataTypes.ENUM('decider', 'reviewer', 'contributor', 'observer'), allowNull: false },
  authority_rank:   { type: DataTypes.INTEGER, allowNull: false },
  created_at:       DataTypes.DATE,
  updated_at:       DataTypes.DATE,
  deleted_at:       DataTypes.DATE,
}, { sequelize, tableName: 'project_members', paranoid: true });

ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
ProjectMember.belongsTo(User,    { foreignKey: 'user_id',    as: 'user' });
ProjectMember.belongsTo(User,    { foreignKey: 'invited_by', as: 'inviter' });
Project.hasMany(ProjectMember,   { foreignKey: 'project_id', as: 'members' });
