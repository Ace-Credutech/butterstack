import { ApiDetails } from '@setup/api/api.interface';
import health_ready_function from './health-ready.function';
import { health_ready_query_zod } from './health-ready.query.schema';
import { health_ready_body_zod } from './health-ready.body.schema';
import { health_ready_tests } from './health-ready.test';

export const health_ready_details: ApiDetails = {
  module:              'Health',
  api_name:            'Ready',
  api_description:     'Readiness probe — checks DB and Redis; 503 when any dependency is down',
  method:              'get',
  path:                '/api/health/ready',
  query_schema:        health_ready_query_zod,
  body_schema:         health_ready_body_zod,
  execution_function:  health_ready_function as any,
  tests:               health_ready_tests,
  roles:               ['Public'],
  uses_transaction:    false,
};
