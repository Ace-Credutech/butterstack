import type { WorkerDetails } from '@setup/queue/setup-worker';

export type InitialContextBuildPayload = {
  project_id: string;
  user_id:    string;
  trace_id?:  string;
};

export const initial_context_worker: WorkerDetails = {
  queue:       'projects',
  job_name:    'project.initial-context.build',
  description: 'Build initial-context JSON + markdown for a project after Step 2 closes (Phase B.5)',
  concurrency: 2,
  api_call: (payload: InitialContextBuildPayload) => ({
    method: 'post',
    path:   '/api/internal/initial-context-build',
    body:   {
      project_id: payload.project_id,
      user_id:    payload.user_id,
    },
  }),
};
