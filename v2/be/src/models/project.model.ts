import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Organisation } from './organisation.model';
import { User } from './user.model';

export type ProjectStatus = 'draft' | 'active' | 'archived';

export class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  declare id:         CreationOptional<string>;
  declare org_id:     ForeignKey<Organisation['id']>;
  declare owner_id:   ForeignKey<User['id']>;
  declare name:       string;
  declare slug:       string;
  declare brief:      CreationOptional<string | null>;
  declare status:     CreationOptional<ProjectStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare deleted_at: CreationOptional<Date | null>;
}

Project.init({
  id:         { type: DataTypes.UUID,   defaultValue: DataTypes.UUIDV4, primaryKey: true },
  org_id:     { type: DataTypes.UUID,   allowNull: false, references: { model: 'organisations', key: 'id' } },
  owner_id:   { type: DataTypes.UUID,   allowNull: false, references: { model: 'users',         key: 'id' } },
  name:       { type: DataTypes.STRING, allowNull: false },
  slug:       { type: DataTypes.STRING, allowNull: false, unique: true },
  brief:      { type: DataTypes.TEXT,   allowNull: true },
  status:     { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
  deleted_at: DataTypes.DATE,
}, { sequelize, tableName: 'projects' });

Project.belongsTo(Organisation, { foreignKey: 'org_id',   as: 'org' });
Project.belongsTo(User,         { foreignKey: 'owner_id', as: 'owner' });
Organisation.hasMany(Project,   { foreignKey: 'org_id',   as: 'projects' });
User.hasMany(Project,           { foreignKey: 'owner_id', as: 'owned_projects' });
