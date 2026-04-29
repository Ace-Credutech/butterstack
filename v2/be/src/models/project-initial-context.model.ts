import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Project } from './project.model';

export type ProjectInitialContextStatus = 'pending' | 'building' | 'ready' | 'failed';

export interface InitialContextBullet {
  text:                string;
  source_document_ids: string[];
}

export interface InitialContextSection {
  heading: string;
  bullets: InitialContextBullet[];
}

export interface InitialContextPayload {
  title:           string;
  summary:         string;
  sections:        InitialContextSection[];
  open_questions?: string[];
  glossary?:       { term: string; definition: string }[];
}

export class ProjectInitialContext extends Model<InferAttributes<ProjectInitialContext>, InferCreationAttributes<ProjectInitialContext>> {
  declare project_id:            ForeignKey<Project['id']>;
  declare status:                CreationOptional<ProjectInitialContextStatus>;
  declare json_payload:          CreationOptional<InitialContextPayload | null>;
  declare markdown_text:         CreationOptional<string | null>;
  declare prompt_run_id:         CreationOptional<string | null>;
  declare generated_at:          CreationOptional<Date | null>;
  declare generated_by_event_id: CreationOptional<string | null>;
  declare error_message:         CreationOptional<string | null>;
  declare created_at:            CreationOptional<Date>;
  declare updated_at:            CreationOptional<Date>;
}

ProjectInitialContext.init({
  project_id:            { type: DataTypes.UUID, primaryKey: true, references: { model: 'projects', key: 'id' } },
  status:                { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
  json_payload:          { type: DataTypes.JSONB, allowNull: true },
  markdown_text:         { type: DataTypes.TEXT,  allowNull: true },
  prompt_run_id:         { type: DataTypes.UUID,  allowNull: true },
  generated_at:          { type: DataTypes.DATE,  allowNull: true },
  generated_by_event_id: { type: DataTypes.UUID,  allowNull: true },
  error_message:         { type: DataTypes.TEXT,  allowNull: true },
  created_at:            DataTypes.DATE,
  updated_at:            DataTypes.DATE,
}, {
  sequelize,
  tableName:  'project_initial_context',
  paranoid:   false,
  timestamps: true,
});

Project.hasOne(ProjectInitialContext,    { foreignKey: 'project_id', as: 'initial_context' });
ProjectInitialContext.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
