import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { User } from './user.model';

export class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  declare id:         CreationOptional<string>;
  declare owner_id:   ForeignKey<User['id']>;
  declare name:       string;
  declare slug:       string;
  declare brief:      CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare deleted_at: CreationOptional<Date | null>;
}

Project.init({
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  owner_id:   { type: DataTypes.UUID,   allowNull: false },
  name:       { type: DataTypes.STRING, allowNull: false },
  slug:       { type: DataTypes.STRING, allowNull: false, unique: true },
  brief:      { type: DataTypes.TEXT,   allowNull: true },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
  deleted_at: DataTypes.DATE,
}, { sequelize, tableName: 'projects' });

Project.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasMany(Project,   { foreignKey: 'owner_id', as: 'owned_projects' });
