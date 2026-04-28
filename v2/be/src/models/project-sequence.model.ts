import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Project } from './project.model';

export class ProjectSequence extends Model<InferAttributes<ProjectSequence>, InferCreationAttributes<ProjectSequence>> {
  declare project_id: ForeignKey<Project['id']>;
  declare last_seq:   number;
  declare updated_at: CreationOptional<Date>;
}

ProjectSequence.init({
  project_id: { type: DataTypes.UUID,   primaryKey: true, references: { model: 'projects', key: 'id' } },
  last_seq:   { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  updated_at: DataTypes.DATE,
}, {
  sequelize,
  tableName:  'project_sequences',
  paranoid:   false,
  timestamps: true,
  createdAt:  false,
});

ProjectSequence.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Project.hasOne(ProjectSequence,    { foreignKey: 'project_id', as: 'sequence' });
