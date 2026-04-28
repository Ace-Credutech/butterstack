import { WorkerDetails } from '@setup/queue/setup-worker';
import { projection_rebuild_worker } from '@src/workers/projection-rebuild/projection-rebuild.worker';
import { document_parse_worker }     from '@src/workers/document-parse/document-parse.worker';

export const worker_list: WorkerDetails[] = [
  projection_rebuild_worker,
  document_parse_worker,
];
