import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize }     from '@setup/sequelize';
import { delete_object } from '@setup/storage';
import { log }           from '@setup/log';
import { User }          from './user.model';

export type FileScopeType = 'public' | 'org' | 'project' | 'user' | 'conversation';

export class File extends Model<InferAttributes<File>, InferCreationAttributes<File>> {
  declare id:          CreationOptional<string>;
  declare uploaded_by: ForeignKey<User['id']>;
  declare scope_type:  FileScopeType;
  declare scope_id:    CreationOptional<string | null>;
  declare bucket:      string;
  declare storage_key: string;
  declare filename:    string;
  declare mime_type:   string;
  declare size_bytes:  number;
  declare is_public:   CreationOptional<boolean>;
  declare created_at:  CreationOptional<Date>;
  declare updated_at:  CreationOptional<Date>;
  declare deleted_at:  CreationOptional<Date | null>;
}

File.init({
  id:          { type: DataTypes.UUID,         defaultValue: DataTypes.UUIDV4, primaryKey: true },
  uploaded_by: { type: DataTypes.UUID,         allowNull: false, references: { model: 'users', key: 'id' } },
  scope_type:  { type: DataTypes.STRING(20),   allowNull: false },
  scope_id:    { type: DataTypes.UUID,         allowNull: true },
  bucket:      { type: DataTypes.STRING(100),  allowNull: false },
  storage_key: { type: DataTypes.STRING(500),  allowNull: false },
  filename:    { type: DataTypes.STRING(255),  allowNull: false },
  mime_type:   { type: DataTypes.STRING(100),  allowNull: false },
  size_bytes:  { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 0 },
  is_public:   { type: DataTypes.BOOLEAN,      allowNull: false, defaultValue: false },
  created_at:  DataTypes.DATE,
  updated_at:  DataTypes.DATE,
  deleted_at:  DataTypes.DATE,
}, { sequelize, tableName: 'files', paranoid: true });

File.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Hard-delete (force: true) → wipe from MinIO. Best-effort: log failure but don't block.
File.addHook('afterDestroy', async (file: File) => {
  try {
    await delete_object(file.bucket, file.storage_key);
  } catch (error) {
    log.error('file.afterDestroy.minio_delete_failed', {
      file_id:     file.id,
      bucket:      file.bucket,
      storage_key: file.storage_key,
      error:       String((error as any)?.message ?? error),
    });
  }
});
