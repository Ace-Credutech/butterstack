import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Organisation } from './organisation.model';
import { User } from './user.model';

export type OrgMemberRole = 'owner' | 'admin' | 'member';

export class OrganisationMember extends Model<InferAttributes<OrganisationMember>, InferCreationAttributes<OrganisationMember>> {
  declare org_id:     ForeignKey<Organisation['id']>;
  declare user_id:    ForeignKey<User['id']>;
  declare role:       CreationOptional<OrgMemberRole>;
  declare invited_by: CreationOptional<string | null>;
  declare joined_at:  CreationOptional<Date>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

OrganisationMember.init({
  org_id:     { type: DataTypes.UUID,   allowNull: false, primaryKey: true },
  user_id:    { type: DataTypes.UUID,   allowNull: false, primaryKey: true },
  role:       { type: DataTypes.STRING, allowNull: false, defaultValue: 'member' },
  invited_by: { type: DataTypes.UUID,   allowNull: true },
  joined_at:  { type: DataTypes.DATE,   allowNull: false, defaultValue: DataTypes.NOW },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE,
}, { sequelize, tableName: 'organisation_members', paranoid: false });

Organisation.hasMany(OrganisationMember,     { foreignKey: 'org_id',  as: 'members' });
OrganisationMember.belongsTo(Organisation,   { foreignKey: 'org_id',  as: 'org' });
User.hasMany(OrganisationMember,             { foreignKey: 'user_id', as: 'org_memberships' });
OrganisationMember.belongsTo(User,           { foreignKey: 'user_id', as: 'user' });
