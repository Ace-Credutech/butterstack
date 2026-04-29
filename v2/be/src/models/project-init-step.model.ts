import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Project } from './project.model';
import { User } from './user.model';

export type ProjectInitStepStatus = 'in-progress' | 'done' | 'stale';

export class ProjectInitStep extends Model<InferAttributes<ProjectInitStep>, InferCreationAttributes<ProjectInitStep>> {
  declare project_id: ForeignKey<Project['id']>;
  declare step:       number;
  declare status:     ProjectInitStepStatus;
  declare updated_at: CreationOptional<Date>;
  declare updated_by: CreationOptional<ForeignKey<User['id']> | null>;
}

ProjectInitStep.init({
  project_id: { type: DataTypes.UUID,    primaryKey: true, references: { model: 'projects', key: 'id' } },
  step:       { type: DataTypes.INTEGER, primaryKey: true },
  status:     { type: DataTypes.STRING,  allowNull: false },
  updated_at: DataTypes.DATE,
  updated_by: { type: DataTypes.UUID,    allowNull: true, references: { model: 'users', key: 'id' } },
}, {
  sequelize,
  tableName:  'project_init_steps',
  paranoid:   false,
  timestamps: true,
  createdAt:  false,
});

ProjectInitStep.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Project.hasMany(ProjectInitStep,   { foreignKey: 'project_id', as: 'init_steps' });
