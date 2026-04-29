import { WorkerDetails } from '@setup/queue/setup-worker';
import { projection_rebuild_worker } from '@src/workers/projection-rebuild/projection-rebuild.worker';
import { document_parse_worker }     from '@src/workers/document-parse/document-parse.worker';
import { initial_context_worker }    from '@src/workers/initial-context/initial-context.worker';

export const worker_list: WorkerDetails[] = [
  projection_rebuild_worker,
  document_parse_worker,
  initial_context_worker,
];
