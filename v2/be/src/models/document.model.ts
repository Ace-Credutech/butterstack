import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { User } from './user.model';

export type DocumentParseStatus = 'pending' | 'parsed' | 'failed' | 'cancelled';
export type DocumentPurpose     = 'requirement' | 'design' | 'technical_spec' | 'meeting_notes' | 'wireframe' | 'user_research' | 'competitive_analysis' | 'reference' | 'other';

export class Document extends Model<InferAttributes<Document>, InferCreationAttributes<Document>> {
  declare id:           CreationOptional<string>;
  declare filename:     string;
  declare mime_type:    string;
  declare size_bytes:   number;
  declare storage_key:  string;
  declare kind:         CreationOptional<string>;
  declare purpose:      CreationOptional<DocumentPurpose>;
  declare parse_status: CreationOptional<DocumentParseStatus>;
  declare parsed_text:  CreationOptional<string | null>;
  declare ai_name:      CreationOptional<string | null>;
  declare ai_summary:   CreationOptional<string | null>;
  declare keywords:     CreationOptional<string[]>;
  declare parse_error:  CreationOptional<string | null>;
  declare uploaded_by:  ForeignKey<User['id']>;
  declare created_at:   CreationOptional<Date>;
  declare updated_at:   CreationOptional<Date>;
}

Document.init({
  id:           { type: DataTypes.UUID,                  defaultValue: DataTypes.UUIDV4, primaryKey: true },
  filename:     { type: DataTypes.STRING(255),            allowNull: false },
  mime_type:    { type: DataTypes.STRING(255),            allowNull: false },
  size_bytes:   { type: DataTypes.INTEGER,               allowNull: false, defaultValue: 0 },
  storage_key:  { type: DataTypes.STRING(255),            allowNull: false },
  kind:         { type: DataTypes.STRING(255),            allowNull: false, defaultValue: 'document' },
  purpose:      { type: DataTypes.STRING(255),            allowNull: false, defaultValue: 'other' },
  parse_status: { type: DataTypes.STRING(255),            allowNull: false, defaultValue: 'pending' },
  parsed_text:  { type: DataTypes.TEXT,                  allowNull: true },
  ai_name:      { type: DataTypes.STRING(255),            allowNull: true },
  ai_summary:   { type: DataTypes.TEXT,                  allowNull: true },
  keywords:     { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false, defaultValue: [] },
  parse_error:  { type: DataTypes.TEXT,                  allowNull: true },
  uploaded_by:  { type: DataTypes.UUID,                  allowNull: false, references: { model: 'users', key: 'id' } },
  created_at:   DataTypes.DATE,
  updated_at:   DataTypes.DATE,
}, { sequelize, tableName: 'documents', paranoid: false });

Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });
