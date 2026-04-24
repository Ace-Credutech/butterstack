import { ApiDetails } from '@setup/api/api.interface';
import health_live_function from './health-live.function';
import { health_live_query_zod } from './health-live.query.schema';
import { health_live_body_zod } from './health-live.body.schema';
import { health_live_tests } from './health-live.test';

export const health_live_details: ApiDetails = {
  module:              'Health',
  api_name:            'Live',
  api_description:     'Process liveness probe — no dependencies checked',
  method:              'get',
  path:                '/api/health/live',
  query_schema:        health_live_query_zod,
  body_schema:         health_live_body_zod,
  execution_function:  health_live_function as any,
  tests:               health_live_tests,
  roles:               ['Public'],
  uses_transaction:    false,
};
