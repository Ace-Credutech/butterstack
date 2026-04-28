import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { User } from './user.model';

export type LinkScopeType = 'org' | 'project' | 'user' | 'conversation';

export class Link extends Model<InferAttributes<Link>, InferCreationAttributes<Link>> {
  declare id:          CreationOptional<string>;
  declare scope_type:  LinkScopeType;
  declare scope_id:    string;
  declare url:         string;
  declare title:       CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare added_by:    ForeignKey<User['id']>;
  declare created_at:  CreationOptional<Date>;
  declare updated_at:  CreationOptional<Date>;
  declare deleted_at:  CreationOptional<Date | null>;
}

Link.init({
  id:          { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
  scope_type:  { type: DataTypes.STRING(20),  allowNull: false },
  scope_id:    { type: DataTypes.UUID,        allowNull: false },
  url:         { type: DataTypes.TEXT,        allowNull: false },
  title:       { type: DataTypes.STRING(255), allowNull: true },
  description: { type: DataTypes.TEXT,        allowNull: true },
  added_by:    { type: DataTypes.UUID,        allowNull: false, references: { model: 'users', key: 'id' } },
  created_at:  DataTypes.DATE,
  updated_at:  DataTypes.DATE,
  deleted_at:  DataTypes.DATE,
}, { sequelize, tableName: 'links', paranoid: true });

Link.belongsTo(User, { foreignKey: 'added_by', as: 'author' });
