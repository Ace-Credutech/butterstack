import { health_live_tests_interface } from './health-live.interface';

export const health_live_tests: health_live_tests_interface[] = [
  {
    name:  'Returns live status',
    input: {},
    check_output: (_input, output) => {
      if (output.code !== 200) throw new Error('expected code 200');
    },
  },
];
