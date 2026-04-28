import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Prompt } from './prompt.model';
import { PromptVersion } from './prompt-version.model';
import { User } from './user.model';

export type PromptRunStatus    = 'success' | 'error' | 'timeout' | 'filtered';
export type PromptRunScopeType = 'platform' | 'org' | 'user' | 'project' | 'conversation' | 'system';

export class PromptRun extends Model<InferAttributes<PromptRun>, InferCreationAttributes<PromptRun>> {
  declare id:                CreationOptional<string>;
  declare prompt_id:         ForeignKey<Prompt['id']>;
  declare prompt_version_id: ForeignKey<PromptVersion['id']>;
  declare scope_type:        PromptRunScopeType;
  declare scope_id:          CreationOptional<string | null>;
  declare user_id:           CreationOptional<ForeignKey<User['id']> | null>;
  declare input_payload:     CreationOptional<object>;
  declare retrieval_summary: CreationOptional<object | null>;
  declare output_text:       CreationOptional<string | null>;
  declare output_parsed:     CreationOptional<object | null>;
  declare model_used:        string;
  declare tokens_in:         CreationOptional<number | null>;
  declare tokens_out:        CreationOptional<number | null>;
  declare latency_ms:        CreationOptional<number | null>;
  declare cost_usd:          CreationOptional<number | null>;
  declare status:            PromptRunStatus;
  declare error_code:        CreationOptional<string | null>;
  declare error_message:     CreationOptional<string | null>;
  declare trace_id:          CreationOptional<string | null>;
  declare created_at:        CreationOptional<Date>;
  declare updated_at:        CreationOptional<Date>;
}

PromptRun.init({
  id:                { type: DataTypes.UUID,           defaultValue: DataTypes.UUIDV4, primaryKey: true },
  prompt_id:         { type: DataTypes.UUID,           allowNull: false, references: { model: 'prompts',          key: 'id' } },
  prompt_version_id: { type: DataTypes.UUID,           allowNull: false, references: { model: 'prompt_versions',  key: 'id' } },
  scope_type:        { type: DataTypes.STRING,         allowNull: false },
  scope_id:          { type: DataTypes.UUID,           allowNull: true },
  user_id:           { type: DataTypes.UUID,           allowNull: true,  references: { model: 'users',            key: 'id' } },
  input_payload:     { type: DataTypes.JSONB,          allowNull: false, defaultValue: {} },
  retrieval_summary: { type: DataTypes.JSONB,          allowNull: true },
  output_text:       { type: DataTypes.TEXT,           allowNull: true },
  output_parsed:     { type: DataTypes.JSONB,          allowNull: true },
  model_used:        { type: DataTypes.STRING,         allowNull: false },
  tokens_in:         { type: DataTypes.INTEGER,        allowNull: true },
  tokens_out:        { type: DataTypes.INTEGER,        allowNull: true },
  latency_ms:        { type: DataTypes.INTEGER,        allowNull: true },
  cost_usd:          { type: DataTypes.DECIMAL(10, 6), allowNull: true },
  status:            { type: DataTypes.STRING,         allowNull: false },
  error_code:        { type: DataTypes.STRING,         allowNull: true },
  error_message:     { type: DataTypes.TEXT,           allowNull: true },
  trace_id:          { type: DataTypes.STRING,         allowNull: true },
  created_at:        DataTypes.DATE,
  updated_at:        DataTypes.DATE,
}, { sequelize, tableName: 'prompt_runs', paranoid: false });

PromptRun.belongsTo(Prompt,        { foreignKey: 'prompt_id',         as: 'prompt' });
PromptRun.belongsTo(PromptVersion, { foreignKey: 'prompt_version_id', as: 'version' });
PromptRun.belongsTo(User,          { foreignKey: 'user_id',           as: 'user' });
