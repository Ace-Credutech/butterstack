import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { User } from './user.model';

export class ActivityLog extends Model<InferAttributes<ActivityLog>, InferCreationAttributes<ActivityLog>> {
  declare id:          CreationOptional<string>;
  declare user_id:     ForeignKey<User['id']>;
  declare action:      string;
  declare entity:      string;
  declare entity_id:   CreationOptional<string | null>;
  declare description: string;
  declare trace_id:    string;
  declare created_at:  CreationOptional<Date>;
}

ActivityLog.init({
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:     { type: DataTypes.UUID,   allowNull: false, references: { model: 'users', key: 'id' } },
  action:      { type: DataTypes.STRING, allowNull: false },
  entity:      { type: DataTypes.STRING, allowNull: false },
  entity_id:   { type: DataTypes.UUID,   allowNull: true },
  description: { type: DataTypes.TEXT,   allowNull: false },
  trace_id:    { type: DataTypes.UUID,   allowNull: false },
  created_at:  DataTypes.DATE,
}, {
  sequelize,
  tableName:  'activity_logs',
  paranoid:   false,
  timestamps: true,
  updatedAt:  false,
});

ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
