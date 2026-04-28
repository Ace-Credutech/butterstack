import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '@setup/sequelize';
import { DocumentPassage } from './document-passage.model';

export type PassageLinkType = 'references' | 'continues' | 'elaborates' | 'supersedes' | 'contradicts' | 'supports' | 'depends_on';

export class DocumentPassageLink extends Model<InferAttributes<DocumentPassageLink>, InferCreationAttributes<DocumentPassageLink>> {
  declare id:               CreationOptional<string>;
  declare from_passage_id:  ForeignKey<DocumentPassage['id']>;
  declare to_passage_id:    ForeignKey<DocumentPassage['id']>;
  declare link_type:        PassageLinkType;
  declare created_at:       CreationOptional<Date>;
}

DocumentPassageLink.init({
  id:               { type: DataTypes.UUID,      defaultValue: DataTypes.UUIDV4, primaryKey: true },
  from_passage_id:  { type: DataTypes.UUID, allowNull: false, references: { model: 'document_passages', key: 'id' } },
  to_passage_id:    { type: DataTypes.UUID, allowNull: false, references: { model: 'document_passages', key: 'id' } },
  link_type:        { type: DataTypes.STRING(50), allowNull: false },
  created_at:       DataTypes.DATE,
}, { sequelize, tableName: 'document_passage_links', paranoid: false, updatedAt: false });

DocumentPassage.hasMany(DocumentPassageLink, { foreignKey: 'from_passage_id', as: 'outgoing_links' });
DocumentPassage.hasMany(DocumentPassageLink, { foreignKey: 'to_passage_id',   as: 'incoming_links' });
DocumentPassageLink.belongsTo(DocumentPassage, { foreignKey: 'from_passage_id', as: 'from_passage' });
DocumentPassageLink.belongsTo(DocumentPassage, { foreignKey: 'to_passage_id',   as: 'to_passage' });
