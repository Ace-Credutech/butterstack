import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '@setup/sequelize';

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
  declare id:               CreationOptional<string>;
  declare slug:             string;
  declare name:             string;
  declare description:      CreationOptional<string | null>;
  declare permissions_json: Record<string, unknown>;
  declare is_system:        CreationOptional<boolean>;
  declare created_at:       CreationOptional<Date>;
  declare updated_at:       CreationOptional<Date>;
  declare deleted_at:       CreationOptional<Date | null>;
}

Role.init({
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  slug:             { type: DataTypes.STRING, allowNull: false, unique: true },
  name:             { type: DataTypes.STRING, allowNull: false, unique: true },
  description:      { type: DataTypes.TEXT,   allowNull: true },
  permissions_json: { type: DataTypes.JSONB,  allowNull: false, defaultValue: {} },
  is_system:        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  created_at:       DataTypes.DATE,
  updated_at:       DataTypes.DATE,
  deleted_at:       DataTypes.DATE,
}, { sequelize, tableName: 'roles' });
