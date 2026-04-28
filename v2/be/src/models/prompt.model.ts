import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '@setup/sequelize';

export type PromptCategory = 'project' | 'intake' | 'regenerate' | 'admin' | 'context' | 'conversation' | 'system';
export type PromptStatus   = 'active' | 'paused' | 'deprecated';

export class Prompt extends Model<InferAttributes<Prompt>, InferCreationAttributes<Prompt>> {
  declare id:                 CreationOptional<string>;
  declare slug:               string;
  declare name:               string;
  declare description:        CreationOptional<string | null>;
  declare category:           PromptCategory;
  declare current_version_id: CreationOptional<string | null>;
  declare status:             CreationOptional<PromptStatus>;
  declare created_at:         CreationOptional<Date>;
  declare updated_at:         CreationOptional<Date>;
}

Prompt.init({
  id:                 { type: DataTypes.UUID,   defaultValue: DataTypes.UUIDV4, primaryKey: true },
  slug:               { type: DataTypes.STRING, allowNull: false, unique: true },
  name:               { type: DataTypes.STRING, allowNull: false },
  description:        { type: DataTypes.TEXT,   allowNull: true },
  category:           { type: DataTypes.STRING, allowNull: false },
  current_version_id: { type: DataTypes.UUID,   allowNull: true, references: { model: 'prompt_versions', key: 'id' } },
  status:             { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
  created_at:         DataTypes.DATE,
  updated_at:         DataTypes.DATE,
}, { sequelize, tableName: 'prompts', paranoid: false });
