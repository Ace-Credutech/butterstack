import { ApiDetails } from '@setup/api/api.interface';
import list_project_documents_function from './list-project-documents.function';
import { list_project_documents_query_zod } from './list-project-documents.query.schema';
import { list_project_documents_body_zod }  from './list-project-documents.body.schema';
import { list_project_documents_tests }     from './list-project-documents.test';

export const list_project_documents_details: ApiDetails = {
  module:              'Projects',
  api_name:            'List Project Documents',
  api_description:     'Returns all documents (uploads + pasted entries) linked to a project, including parse status and uploader.',
  method:              'get',
  path:                '/api/projects/{project_id}/documents',
  query_schema:        list_project_documents_query_zod,
  body_schema:         list_project_documents_body_zod,
  execution_function:  list_project_documents_function as any,
  tests:               list_project_documents_tests,
  roles:               ['Member'],
  uses_transaction:    false,
};
