import { Error_Interface } from '@config/interfaces/error.interface';
import { Document } from '@models/document.model';
import { DocumentLink } from '@models/document-link.model';
import { Project } from '@models/project.model';
import { User } from '@models/user.model';
import { list_project_documents_function_params, list_project_documents_function_return } from './list-project-documents.interface';

const fetch_project = async (project_id: string) => Project.findByPk(project_id);

const fetch_links_with_documents = async (project_id: string) =>
  DocumentLink.findAll({
    where:   { entity_type: 'project', entity_id: project_id },
    include: [{
      model:   Document,
      as:      'document',
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'email'] }],
    }],
    order:   [['created_at', 'DESC']],
  });

const shape_item = (link: DocumentLink) => {
  const doc = (link as any).document as Document;
  return {
    id:           doc.id,
    link_id:      link.id,
    filename:     doc.filename,
    mime_type:    doc.mime_type,
    size_bytes:   doc.size_bytes,
    kind:         doc.kind,
    purpose:      doc.purpose,
    parse_status: doc.parse_status,
    parse_error:  doc.parse_error ?? null,
    ai_name:      doc.ai_name,
    ai_summary:   doc.ai_summary,
    keywords:     doc.keywords,
    has_storage:  !!doc.storage_key,
    uploaded_by:  (doc as any).uploader ? { id: (doc as any).uploader.id, name: (doc as any).uploader.name } : null,
    created_at:   doc.created_at,
  };
};

const list_project_documents_function = async (data: list_project_documents_function_params): Promise<list_project_documents_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const project = await fetch_project(data.project_id);
  if (!project) return { code: 404, message: 'Project not found' };

  const links = await fetch_links_with_documents(data.project_id);
  const items = links.map(shape_item);

  return {
    code:    200,
    message: 'project documents',
    data: {
      project_id: project.id,
      items,
    },
  };
};

export default list_project_documents_function;
