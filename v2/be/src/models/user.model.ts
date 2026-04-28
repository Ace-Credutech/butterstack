import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Role } from './role.model';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id:           CreationOptional<string>;
  declare email:        string;
  declare name:         string;
  declare keycloak_sub: string;
  declare role_id:      ForeignKey<Role['id']> | null;
  declare is_active:    CreationOptional<boolean>;
  declare created_at:   CreationOptional<Date>;
  declare updated_at:   CreationOptional<Date>;
  declare deleted_at:   CreationOptional<Date | null>;
}

User.init({
  id:           { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email:        { type: DataTypes.STRING,  allowNull: false, unique: true },
  name:         { type: DataTypes.STRING,  allowNull: false },
  keycloak_sub: { type: DataTypes.STRING,  allowNull: false, unique: true },
  role_id:      { type: DataTypes.UUID,    allowNull: true,  references: { model: 'roles',        key: 'id' } },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at:   DataTypes.DATE,
  updated_at:   DataTypes.DATE,
  deleted_at:   DataTypes.DATE,
}, { sequelize, tableName: 'users' });

User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User,   { foreignKey: 'role_id', as: 'users' });
