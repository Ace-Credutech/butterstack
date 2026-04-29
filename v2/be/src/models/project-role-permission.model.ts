import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Project } from './project.model';
import { User } from './user.model';
import { ProjectRole } from './project-role.model';

export class ProjectRolePermission extends Model<InferAttributes<ProjectRolePermission>, InferCreationAttributes<ProjectRolePermission>> {
  declare id:             CreationOptional<string>;
  declare project_id:     ForeignKey<Project['id']>;
  declare role_id:        ForeignKey<ProjectRole['id']>;
  declare permission_key: string;
  declare feature_id:     CreationOptional<string | null>;
  declare allow:          CreationOptional<boolean>;
  declare created_at:     CreationOptional<Date>;
  declare updated_at:     CreationOptional<Date>;
  declare created_by:     CreationOptional<ForeignKey<User['id']> | null>;
  declare updated_by:     CreationOptional<ForeignKey<User['id']> | null>;
}

ProjectRolePermission.init({
  id:             { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  project_id:     { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  role_id:        { type: DataTypes.UUID, allowNull: false, references: { model: 'project_roles', key: 'id' } },
  permission_key: { type: DataTypes.STRING(160), allowNull: false },
  feature_id:     { type: DataTypes.UUID, allowNull: true },
  allow:          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_at:     DataTypes.DATE,
  updated_at:     DataTypes.DATE,
  created_by:     { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
  updated_by:     { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
}, {
  sequelize,
  tableName:  'project_role_permissions',
  paranoid:   false,
  timestamps: true,
});

ProjectRole.hasMany(ProjectRolePermission,    { foreignKey: 'role_id', as: 'permissions' });
ProjectRolePermission.belongsTo(ProjectRole,  { foreignKey: 'role_id', as: 'role' });
ProjectRolePermission.belongsTo(Project,      { foreignKey: 'project_id', as: 'project' });
