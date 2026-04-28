import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Document } from './document.model';

export type EntityType = 'person' | 'team' | 'technology' | 'feature' | 'product' | 'company' | 'other';

export class DocumentEntity extends Model<InferAttributes<DocumentEntity>, InferCreationAttributes<DocumentEntity>> {
  declare id:          CreationOptional<string>;
  declare document_id: ForeignKey<Document['id']>;
  declare name:        string;
  declare type:        EntityType;
  declare created_at:  CreationOptional<Date>;
  declare updated_at:  CreationOptional<Date>;
}

DocumentEntity.init({
  id:          { type: DataTypes.UUID,     defaultValue: DataTypes.UUIDV4, primaryKey: true },
  document_id: { type: DataTypes.UUID,     allowNull: false, references: { model: 'documents', key: 'id' } },
  name:        { type: DataTypes.STRING(255), allowNull: false },
  type:        { type: DataTypes.STRING(50),  allowNull: false },
  created_at:  DataTypes.DATE,
  updated_at:  DataTypes.DATE,
}, { sequelize, tableName: 'document_entities', paranoid: false });

Document.hasMany(DocumentEntity,     { foreignKey: 'document_id', as: 'entities' });
DocumentEntity.belongsTo(Document,   { foreignKey: 'document_id', as: 'document' });
