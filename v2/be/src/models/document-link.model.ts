import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { Document } from './document.model';
import { User } from './user.model';

export type DocumentLinkEntityType = 'org' | 'project' | 'user' | 'conversation';

export class DocumentLink extends Model<InferAttributes<DocumentLink>, InferCreationAttributes<DocumentLink>> {
  declare id:          CreationOptional<string>;
  declare document_id: ForeignKey<Document['id']>;
  declare entity_type: DocumentLinkEntityType;
  declare entity_id:   string;
  declare linked_by:   CreationOptional<ForeignKey<User['id']> | null>;
  declare created_at:  CreationOptional<Date>;
}

DocumentLink.init({
  id:          { type: DataTypes.UUID,       defaultValue: DataTypes.UUIDV4, primaryKey: true },
  document_id: { type: DataTypes.UUID,       allowNull: false, references: { model: 'documents', key: 'id' } },
  entity_type: { type: DataTypes.STRING(20), allowNull: false },
  entity_id:   { type: DataTypes.UUID,       allowNull: false },
  linked_by:   { type: DataTypes.UUID,       allowNull: true,  references: { model: 'users', key: 'id' } },
  created_at:  DataTypes.DATE,
}, { sequelize, tableName: 'document_links', paranoid: false, updatedAt: false });

Document.hasMany(DocumentLink,   { foreignKey: 'document_id', as: 'links' });
DocumentLink.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });
DocumentLink.belongsTo(User,     { foreignKey: 'linked_by',   as: 'linker' });
