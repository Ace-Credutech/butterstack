import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '@setup/sequelize';

export class ProjectSequence extends Model<InferAttributes<ProjectSequence>, InferCreationAttributes<ProjectSequence>> {
  declare project_id:  string;
  declare last_seq:    number;
  declare updated_at:  CreationOptional<Date>;
}

ProjectSequence.init({
  project_id: { type: DataTypes.UUID, primaryKey: true },
  last_seq:   { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  updated_at: DataTypes.DATE,
}, {
  sequelize,
  tableName:  'project_sequences',
  paranoid:   false,
  timestamps: true,
  createdAt:  false,
});
