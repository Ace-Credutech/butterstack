import type { WorkerDetails } from '@setup/queue/setup-worker';

export type DocumentParsePayload = {
  document_id: string;
  entity_type: string;
  entity_id:   string;
  uploaded_by: string;
  trace_id?:   string;
};

export const document_parse_worker: WorkerDetails = {
  queue:       'documents',
  job_name:    'document.parse',
  description: 'Parse uploaded document — extract passages, entities, keywords via AI',
  concurrency: 4,
  api_call: (payload: DocumentParsePayload) => ({
    method: 'post',
    path:   '/api/internal/document-parse',
    body:   {
      document_id: payload.document_id,
      entity_type: payload.entity_type,
      entity_id:   payload.entity_id,
      uploaded_by: payload.uploaded_by,
    },
  }),
};
