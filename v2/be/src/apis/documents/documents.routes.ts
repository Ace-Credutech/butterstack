import { Context } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { app }               from '@setup/hono';
import { auth_middleware }   from '@setup/auth-middleware';
import { put_object, delete_object, get_presigned_url } from '@setup/storage';
import { get_queue }         from '@setup/queue/queue';
import { env }               from '@src/env';
import { log }               from '@setup/log';
import { Document }          from '@models/document.model';
import { DocumentLink }      from '@models/document-link.model';
import { DocumentPassage }   from '@models/document-passage.model';
import { DocumentEntity }    from '@models/document-entity.model';
import { PromptRun }         from '@models/prompt-run.model';
import { Prompt }            from '@models/prompt.model';
import { PromptVersion }     from '@models/prompt-version.model';
import { User }              from '@models/user.model';
import { Project }           from '@models/project.model';
import { Organisation }      from '@models/organisation.model';
import { Op }                from 'sequelize';
import type { DocumentLinkEntityType } from '@models/document-link.model';
import { sequelize }         from '@setup/sequelize';
import type { DocumentParsePayload } from '@src/workers/document-parse/document-parse.worker';

const BUCKET             = env.MINIO_BUCKET_NAME ?? 'butterstack';
const VALID_ENTITY_TYPES = new Set<string>(['org', 'project', 'user', 'conversation']);
const DEFAULT_PAGE_SIZE  = 20;
const MAX_PAGE_SIZE      = 100;

const ok  = (c: Context, data: unknown, message = 'ok') => c.json({ code: 200, message, data }, 200);
const err = (c: Context, code: number, message: string) => c.json({ code, message }, code as any);

const require_user = (c: Context) => c.get('user') ?? null;

const make_storage_key = (entity_type: string, entity_id: string, filename: string): string => {
  try {
    const safe_name = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `documents/${entity_type}/${entity_id}/${uuidv4()}/${safe_name}`;
  } catch (error) {
    log.error('documents.make_storage_key.failed', { error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const shape_document = (doc: Document, link?: DocumentLink) => ({
  id:               doc.id,
  filename:         doc.filename,
  mime_type:        doc.mime_type,
  size_bytes:       doc.size_bytes,
  kind:             doc.kind,
  purpose:          doc.purpose,
  parse_status:     doc.parse_status,
  ai_name:          doc.ai_name,
  ai_summary:       doc.ai_summary,
  keywords:         doc.keywords,
  entity_type:      link?.entity_type ?? null,
  entity_id:        link?.entity_id   ?? null,
  uploaded_by:      (doc as any).uploader ? { id: (doc as any).uploader.id, name: (doc as any).uploader.name, email: (doc as any).uploader.email } : null,
  created_at:       doc.created_at,
});

// POST /api/documents/upload
const upload_document = async (c: Context) => {
  try {
    const user = require_user(c);
    if (!user) return err(c, 401, 'Authentication required');

    const form        = await c.req.parseBody();
    const file        = form['file']        as File   | undefined;
    const entity_type = form['entity_type'] as string | undefined;
    const entity_id   = form['entity_id']   as string | undefined;
    const purpose     = (form['purpose']    as string | undefined) ?? 'other';

    if (!file)                                return err(c, 400, 'file is required');
    if (!entity_type || !entity_id)           return err(c, 400, 'entity_type and entity_id are required');
    if (!VALID_ENTITY_TYPES.has(entity_type)) return err(c, 400, `Invalid entity_type: ${entity_type}`);

    const buffer      = Buffer.from(await file.arrayBuffer());
    const storage_key = make_storage_key(entity_type, entity_id, file.name);

    await put_object(BUCKET, storage_key, buffer, file.type || 'application/octet-stream');

    const tx = await sequelize.transaction();
    try {
      const doc = await Document.create({
        filename:     file.name,
        mime_type:    file.type || 'application/octet-stream',
        size_bytes:   buffer.length,
        storage_key,
        kind:         'document',
        purpose:      purpose as any,
        parse_status: 'pending',
        uploaded_by:  user.id,
      }, { transaction: tx });

      const link = await DocumentLink.create({
        document_id: doc.id,
        entity_type: entity_type as DocumentLinkEntityType,
        entity_id,
        linked_by:   user.id,
      }, { transaction: tx });

      await tx.commit();

      const parse_payload: DocumentParsePayload = {
        document_id: doc.id,
        entity_type,
        entity_id,
        uploaded_by: user.id,
      };
      void get_queue().publish<DocumentParsePayload>('documents', 'document.parse', parse_payload, { delay_ms: 500 });

      return ok(c, shape_document(doc, link), 'document uploaded');
    } catch (e) {
      await tx.rollback();
      await delete_object(BUCKET, storage_key).catch(() => {});
      throw e;
    }
  } catch (error) {
    log.error('documents.upload.failed', { error: String((error as any)?.message ?? error) });
    return err(c, 500, 'Upload failed');
  }
};

// GET /api/documents?entity_type=&entity_id=&page=1&page_size=20
const list_documents = async (c: Context) => {
  try {
    const user = require_user(c);
    if (!user) return err(c, 401, 'Authentication required');

    const entity_type = c.req.query('entity_type');
    const entity_id   = c.req.query('entity_id');
    const page        = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
    const page_size   = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(c.req.query('page_size') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));

    if (!entity_type || !entity_id)           return err(c, 400, 'entity_type and entity_id are required');
    if (!VALID_ENTITY_TYPES.has(entity_type)) return err(c, 400, `Invalid entity_type: ${entity_type}`);

    const { count, rows: links } = await DocumentLink.findAndCountAll({
      where:   { entity_type, entity_id },
      include: [{
        model:   Document,
        as:      'document',
        include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'email'] }],
      }],
      order:  [['created_at', 'DESC']],
      limit:  page_size,
      offset: (page - 1) * page_size,
    });

    const items       = links.map(l => shape_document((l as any).document as Document, l));
    const total_pages = Math.ceil(count / page_size);

    return ok(c, { items, total: count, page, page_size, total_pages }, 'documents');
  } catch (error) {
    log.error('documents.list.failed', { error: String((error as any)?.message ?? error) });
    return err(c, 500, 'Failed to list documents');
  }
};

// GET /api/documents/:id/content
const get_document_content = async (c: Context) => {
  try {
    const user = require_user(c);
    if (!user) return err(c, 401, 'Authentication required');

    const id  = c.req.param('id');
    const doc = await Document.findByPk(id, {
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!doc) return err(c, 404, 'Document not found');

    const passages = await DocumentPassage.findAll({
      where: { document_id: id },
      order: [['idx', 'ASC']],
    });

    const entities = await DocumentEntity.findAll({
      where: { document_id: id },
      order: [['created_at', 'ASC']],
    });

    return ok(c, {
      document: shape_document(doc),
      passages: passages.map(p => ({ id: p.id, idx: p.idx, type: p.type, heading: p.heading, text: p.text, keywords: p.keywords })),
      entities: entities.map(e => ({ id: e.id, name: e.name, type: e.type })),
    }, 'document content');
  } catch (error) {
    log.error('documents.content.failed', { error: String((error as any)?.message ?? error) });
    return err(c, 500, 'Failed to get document content');
  }
};

// DELETE /api/documents/:id
const delete_document = async (c: Context) => {
  try {
    const user = require_user(c);
    if (!user) return err(c, 401, 'Authentication required');

    const id  = c.req.param('id');
    const doc = await Document.findByPk(id);
    if (!doc) return err(c, 404, 'Document not found');

    await delete_object(BUCKET, doc.storage_key);
    await DocumentLink.destroy({ where: { document_id: id } });
    await doc.destroy();

    return ok(c, { id }, 'document deleted');
  } catch (error) {
    log.error('documents.delete.failed', { error: String((error as any)?.message ?? error) });
    return err(c, 500, 'Failed to delete document');
  }
};

// GET /api/documents/:id/url
const get_document_url = async (c: Context) => {
  try {
    const user = require_user(c);
    if (!user) return err(c, 401, 'Authentication required');

    const id  = c.req.param('id');
    const doc = await Document.findByPk(id);
    if (!doc) return err(c, 404, 'Document not found');

    const url = await get_presigned_url(BUCKET, doc.storage_key, 3600);
    return ok(c, { url, expires_in: 3600 }, 'presigned url');
  } catch (error) {
    log.error('documents.get_url.failed', { error: String((error as any)?.message ?? error) });
    return err(c, 500, 'Failed to generate URL');
  }
};

// GET /api/documents/:id/runs
const get_document_runs = async (c: Context) => {
  try {
    const user = require_user(c);
    if (!user) return err(c, 401, 'Authentication required');

    const id = c.req.param('id');
    const runs = await PromptRun.findAll({
      where:   { scope_type: 'document', scope_id: id },
      include: [
        { model: Prompt,        as: 'prompt',  attributes: ['slug', 'name'] },
        { model: PromptVersion, as: 'version', attributes: ['model', 'temperature', 'max_tokens'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const items = runs.map(r => ({
      id:            r.id,
      prompt_slug:   (r as any).prompt?.slug    ?? null,
      prompt_name:   (r as any).prompt?.name    ?? null,
      model:         r.model_used,
      status:        r.status,
      tokens_in:     r.tokens_in,
      tokens_out:    r.tokens_out,
      latency_ms:    r.latency_ms,
      input_payload: r.input_payload,
      output_text:   r.output_text,
      output_parsed: r.output_parsed,
      error_message: r.error_message,
      created_at:    r.created_at,
    }));

    return ok(c, { items }, 'prompt runs');
  } catch (error) {
    log.error('documents.get_runs.failed', { error: String((error as any)?.message ?? error) });
    return err(c, 500, 'Failed to get runs');
  }
};

// GET /api/documents/all?org_id=&entity_type=&page=&page_size=
const list_all_documents = async (c: Context) => {
  try {
    const user = require_user(c);
    if (!user) return err(c, 401, 'Authentication required');

    const org_id            = c.req.query('org_id');
    const entity_type_filter = c.req.query('entity_type');
    const page      = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
    const page_size = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(c.req.query('page_size') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));

    if (!org_id) return err(c, 400, 'org_id is required');

    const project_ids = await Project.findAll({ where: { org_id }, attributes: ['id'], paranoid: false })
      .then(ps => ps.map(p => p.id));

    const build_where = () => {
      if (entity_type_filter === 'org')     return { entity_type: 'org',     entity_id: org_id };
      if (entity_type_filter === 'project') return { entity_type: 'project', entity_id: { [Op.in]: project_ids.length ? project_ids : ['__none__'] } };
      if (entity_type_filter === 'user')    return { entity_type: 'user',    entity_id: user.id };
      return {
        [Op.or]: [
          { entity_type: 'org',     entity_id: org_id },
          ...(project_ids.length ? [{ entity_type: 'project', entity_id: { [Op.in]: project_ids } }] : []),
          { entity_type: 'user',    entity_id: user.id },
        ],
      };
    };

    const { count, rows: links } = await DocumentLink.findAndCountAll({
      where:   build_where(),
      include: [{
        model:   Document,
        as:      'document',
        include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'email'] }],
      }],
      order:  [['created_at', 'DESC']],
      limit:  page_size,
      offset: (page - 1) * page_size,
    });

    const org = await Organisation.findByPk(org_id, { attributes: ['name'] });
    const projects_map: Record<string, string> = {};
    if (project_ids.length) {
      const ps = await Project.findAll({ where: { id: { [Op.in]: project_ids } }, attributes: ['id', 'name'], paranoid: false });
      for (const p of ps) projects_map[p.id] = p.name;
    }

    const scope_label = (link: DocumentLink): string => {
      if (link.entity_type === 'org')     return org?.name ?? 'Organization';
      if (link.entity_type === 'project') return `Project: ${projects_map[link.entity_id] ?? link.entity_id.slice(0, 8)}`;
      if (link.entity_type === 'user')    return 'My Documents';
      return link.entity_type;
    };

    const items = links.map(l => ({
      ...shape_document((l as any).document as Document, l),
      scope_label: scope_label(l),
    }));

    return ok(c, { items, total: count, page, page_size, total_pages: Math.ceil(count / page_size) }, 'documents');
  } catch (error) {
    log.error('documents.list_all.failed', { error: String((error as any)?.message ?? error) });
    return err(c, 500, 'Failed to list documents');
  }
};

export const register_document_routes = () => {
  app.use('/api/documents/*', auth_middleware);
  app.post('/api/documents/upload',     upload_document);
  app.get('/api/documents/all',         list_all_documents);
  app.get('/api/documents',             list_documents);
  app.get('/api/documents/:id/runs',    get_document_runs);
  app.get('/api/documents/:id/content', get_document_content);
  app.delete('/api/documents/:id',      delete_document);
  app.get('/api/documents/:id/url',     get_document_url);
};
