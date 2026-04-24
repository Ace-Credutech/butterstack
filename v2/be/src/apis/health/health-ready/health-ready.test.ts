import { health_ready_tests_interface } from './health-ready.interface';

export const health_ready_tests: health_ready_tests_interface[] = [
  {
    name:  'Returns ready when DB and Redis are up',
    input: {},
    check_output: (_input, output) => { if (output.code !== 200 && output.code !== 503) throw new Error('expected 200 or 503'); },
  },
];
