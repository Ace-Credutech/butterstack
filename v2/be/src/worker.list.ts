import { WorkerDetails } from '@setup/queue/setup-worker';
import { projection_rebuild_worker } from '@src/workers/projection-rebuild/projection-rebuild.worker';

export const worker_list: WorkerDetails[] = [
  projection_rebuild_worker,
];
