import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { User } from './user.model';

export type OrgType = 'personal' | 'team';

export class Organisation extends Model<InferAttributes<Organisation>, InferCreationAttributes<Organisation>> {
  declare id:         CreationOptional<string>;
  declare slug:       string;
  declare name:       string;
  declare type:       CreationOptional<OrgType>;
  declare created_by: ForeignKey<User['id']>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare deleted_at: CreationOptional<Date | null>;
}

Organisation.init({
  id:         { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
  slug:       { type: DataTypes.STRING,  allowNull: false, unique: true },
  name:       { type: DataTypes.STRING,  allowNull: false },
  type:       { type: DataTypes.STRING,  allowNull: false, defaultValue: 'personal' },
  created_by: { type: DataTypes.UUID,    allowNull: false },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
  deleted_at: DataTypes.DATE,
}, { sequelize, tableName: 'organisations', paranoid: true });

Organisation.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Organisation,   { foreignKey: 'created_by', as: 'created_orgs' });
