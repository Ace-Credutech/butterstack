import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Prompt } from './prompt.model';
import { User } from './user.model';

export type PromptVersionStatus = 'draft' | 'active' | 'superseded' | 'rolled_back';
export type PromptModel          = 'claude-opus-4-7' | 'claude-sonnet-4-6' | 'claude-haiku-4-5' | 'gpt-5' | 'gpt-4.1';
export type PromptResponseFormat = 'text' | 'json' | 'json_schema';

export class PromptVersion extends Model<InferAttributes<PromptVersion>, InferCreationAttributes<PromptVersion>> {
  declare id:               CreationOptional<string>;
  declare prompt_id:        ForeignKey<Prompt['id']>;
  declare version:          number;
  declare status:           CreationOptional<PromptVersionStatus>;
  declare system_text:      string;
  declare user_template:    string;
  declare model:            PromptModel;
  declare temperature:      CreationOptional<number>;
  declare max_tokens:       CreationOptional<number>;
  declare response_format:  CreationOptional<PromptResponseFormat>;
  declare response_schema:  CreationOptional<object | null>;
  declare variables_schema: CreationOptional<object>;
  declare rag_strategy:     CreationOptional<object | null>;
  declare notes:            CreationOptional<string | null>;
  declare created_by:       CreationOptional<ForeignKey<User['id']> | null>;
  declare created_at:       CreationOptional<Date>;
  declare updated_at:       CreationOptional<Date>;
}

PromptVersion.init({
  id:               { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
  prompt_id:        { type: DataTypes.UUID,    allowNull: false, references: { model: 'prompts', key: 'id' } },
  version:          { type: DataTypes.INTEGER, allowNull: false },
  status:           { type: DataTypes.STRING,  allowNull: false, defaultValue: 'draft' },
  system_text:      { type: DataTypes.TEXT,    allowNull: false },
  user_template:    { type: DataTypes.TEXT,    allowNull: false },
  model:            { type: DataTypes.STRING,  allowNull: false },
  temperature:      { type: DataTypes.DOUBLE,  allowNull: false, defaultValue: 0.7 },
  max_tokens:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2000 },
  response_format:  { type: DataTypes.STRING,  allowNull: false, defaultValue: 'text' },
  response_schema:  { type: DataTypes.JSONB,   allowNull: true },
  variables_schema: { type: DataTypes.JSONB,   allowNull: false, defaultValue: {} },
  rag_strategy:     { type: DataTypes.JSONB,   allowNull: true },
  notes:            { type: DataTypes.TEXT,    allowNull: true },
  created_by:       { type: DataTypes.UUID,    allowNull: true,  references: { model: 'users', key: 'id' } },
  created_at:       DataTypes.DATE,
  updated_at:       DataTypes.DATE,
}, { sequelize, tableName: 'prompt_versions', paranoid: false });

Prompt.hasMany(PromptVersion,   { foreignKey: 'prompt_id',         as: 'versions' });
PromptVersion.belongsTo(Prompt, { foreignKey: 'prompt_id',         as: 'prompt' });
Prompt.belongsTo(PromptVersion, { foreignKey: 'current_version_id', as: 'current_version', constraints: false });
PromptVersion.belongsTo(User,   { foreignKey: 'created_by',        as: 'author' });
