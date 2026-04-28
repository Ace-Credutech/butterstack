import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Document } from './document.model';

export type PassageType = 'section' | 'paragraph' | 'table' | 'list' | 'code' | 'quote' | 'heading';

export class DocumentPassage extends Model<InferAttributes<DocumentPassage>, InferCreationAttributes<DocumentPassage>> {
  declare id:          CreationOptional<string>;
  declare document_id: ForeignKey<Document['id']>;
  declare idx:         number;
  declare type:        PassageType;
  declare heading:     CreationOptional<string | null>;
  declare text:        string;
  declare keywords:    CreationOptional<string[]>;
  declare created_at:  CreationOptional<Date>;
  declare updated_at:  CreationOptional<Date>;
}

DocumentPassage.init({
  id:          { type: DataTypes.UUID,                  defaultValue: DataTypes.UUIDV4, primaryKey: true },
  document_id: { type: DataTypes.UUID,                  allowNull: false, references: { model: 'documents', key: 'id' } },
  idx:         { type: DataTypes.INTEGER,               allowNull: false },
  type:        { type: DataTypes.STRING(50),            allowNull: false },
  heading:     { type: DataTypes.TEXT,                  allowNull: true },
  text:        { type: DataTypes.TEXT,                  allowNull: false },
  keywords:    { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false, defaultValue: [] },
  created_at:  DataTypes.DATE,
  updated_at:  DataTypes.DATE,
}, { sequelize, tableName: 'document_passages', paranoid: false });

Document.hasMany(DocumentPassage,      { foreignKey: 'document_id', as: 'passages' });
DocumentPassage.belongsTo(Document,    { foreignKey: 'document_id', as: 'document' });
