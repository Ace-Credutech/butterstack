import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Project } from './project.model';
import { User } from './user.model';

export class ProjectRole extends Model<InferAttributes<ProjectRole>, InferCreationAttributes<ProjectRole>> {
  declare id:          CreationOptional<string>;
  declare project_id:  ForeignKey<Project['id']>;
  declare name:        string;
  declare description: CreationOptional<string | null>;
  declare created_at:  CreationOptional<Date>;
  declare updated_at:  CreationOptional<Date>;
  declare deleted_at:  CreationOptional<Date | null>;
  declare created_by:  CreationOptional<ForeignKey<User['id']> | null>;
  declare updated_by:  CreationOptional<ForeignKey<User['id']> | null>;
}

ProjectRole.init({
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  project_id:  { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  name:        { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  created_at:  DataTypes.DATE,
  updated_at:  DataTypes.DATE,
  deleted_at:  { type: DataTypes.DATE, allowNull: true },
  created_by:  { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
  updated_by:  { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
}, {
  sequelize,
  tableName:  'project_roles',
  paranoid:   true,
  timestamps: true,
});

Project.hasMany(ProjectRole, { foreignKey: 'project_id', as: 'roles' });
ProjectRole.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
