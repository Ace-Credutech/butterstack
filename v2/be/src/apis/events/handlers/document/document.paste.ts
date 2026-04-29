import { z } from 'zod';
import { Document } from '@models/document.model';
import { DocumentLink } from '@models/document-link.model';
import { log_activity } from '@config/common/activity-log-function';
import { EventHandlerDetails, EventHandler } from '../../event.types';

// project.document.paste — D-1 from boss's plan.
// User pasted raw text into Step 2 textarea instead of uploading a file.
// Stored as a Document row with kind='paste', no storage_key, parsed_text=raw,
// parse_status='parsed' (no worker needed). Linked to the project via DocumentLink.

const payload_schema = z.object({
  title:    z.string().min(1).max(255),
  content:  z.string().min(1),
  purpose:  z.enum(['requirement', 'design', 'technical_spec', 'meeting_notes', 'wireframe', 'user_research', 'competitive_analysis', 'reference', 'other']).default('other'),
});

type Payload = z.infer<typeof payload_schema>;

const create_paste_document = async (
  args: { project_id: string; user_id: string; title: string; content: string; purpose: string },
  transaction: any,
) => {
  return Document.create({
    filename:     args.title,
    mime_type:    'text/plain',
    size_bytes:   Buffer.byteLength(args.content, 'utf-8'),
    storage_key:  null,
    kind:         'paste',
    purpose:      args.purpose as any,
    parse_status: 'parsed',
    parsed_text:  args.content,
    keywords:     [],
    uploaded_by:  args.user_id,
  } as any, { transaction });
};

const link_to_project = async (
  document_id: string,
  project_id: string,
  user_id: string,
  transaction: any,
) => {
  return DocumentLink.create({
    document_id,
    entity_type: 'project',
    entity_id:   project_id,
    linked_by:   user_id,
  } as any, { transaction });
};

const handler: EventHandler<Payload> = async (payload, scope, ctx, transaction) => {
  const doc = await create_paste_document({
    project_id: scope.project_id,
    user_id:    ctx.actor.id,
    title:      payload.title,
    content:    payload.content,
    purpose:    payload.purpose,
  }, transaction);

  const link = await link_to_project(doc.id, scope.project_id, ctx.actor.id, transaction);

  await log_activity({
    user_id:     ctx.actor.id,
    action:      'project.document.paste',
    entity:      'Document',
    entity_id:   doc.id,
    description: `Pasted "${payload.title}" into project context (${doc.size_bytes} bytes)`,
  }, transaction);

  return {
    state_delta: {
      document: {
        id:        doc.id,
        kind:      doc.kind,
        filename:  doc.filename,
        size:      doc.size_bytes,
        link_id:   link.id,
      },
    },
    affected_entities: { documents: [doc.id], projects: [scope.project_id] },
  };
};

export const project_document_paste_handler: EventHandlerDetails = {
  type:           'project.document.paste',
  payload_schema,
  handler:        handler as any,
};
