import { QueryInterface, DataTypes } from 'sequelize';

// D-5 — RBAC matrix output from Roles step.
// One row per (role, permission_key, feature_id?). feature_id is NULL until
// Phase F lands modules/features; for now we operate purely on permission_key.

export const up = async (qi: QueryInterface) => {
  await qi.createTable('project_role_permissions', {
    id:             { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    project_id:     { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' }, onDelete: 'CASCADE' },
    role_id:        { type: DataTypes.UUID, allowNull: false, references: { model: 'project_roles', key: 'id' }, onDelete: 'CASCADE' },
    permission_key: { type: DataTypes.STRING(160), allowNull: false },
    feature_id:     { type: DataTypes.UUID, allowNull: true },
    allow:          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at:     { type: DataTypes.DATE, allowNull: false },
    updated_at:     { type: DataTypes.DATE, allowNull: false },
    created_by:     { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    updated_by:     { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
  });

  await qi.sequelize.query(`CREATE INDEX project_role_permissions_role_id_idx ON project_role_permissions (role_id);`);
  await qi.sequelize.query(`CREATE INDEX project_role_permissions_project_id_idx ON project_role_permissions (project_id);`);
  // Two unique indexes: one for rows with feature_id (NULLs treated distinct in PG btree),
  // one for the feature_id IS NULL case so role × permission_key remains unique pre-Phase F.
  await qi.sequelize.query(`CREATE UNIQUE INDEX project_role_permissions_role_perm_feature_uniq ON project_role_permissions (role_id, permission_key, feature_id) WHERE feature_id IS NOT NULL;`);
  await qi.sequelize.query(`CREATE UNIQUE INDEX project_role_permissions_role_perm_nullfeature_uniq ON project_role_permissions (role_id, permission_key) WHERE feature_id IS NULL;`);
};

export const down = async (qi: QueryInterface) => qi.dropTable('project_role_permissions');
