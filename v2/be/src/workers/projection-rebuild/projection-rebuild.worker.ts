import { WorkerDetails } from '@setup/queue/setup-worker';

type Payload = {
  project_id: string;
  event_id:   string;
  trace_id:   string;
  session_id?: string;
};

export const projection_rebuild_worker: WorkerDetails = {
  queue:        'projection',
  job_name:     'projection.rebuild',
  description:  'Triggered after event.persist — calls the projection-rebuild API which does the real work',
  concurrency:  8,
  api_call: (payload: Payload) => ({
    method:     'post',
    path:       '/api/internal/projection-rebuild',
    body:       { project_id: payload.project_id, event_id: payload.event_id },
    session_id: payload.session_id,
  }),
};
