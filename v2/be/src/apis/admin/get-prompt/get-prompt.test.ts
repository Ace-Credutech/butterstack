import { get_prompt_tests_interface } from './get-prompt.interface';
export const get_prompt_tests: get_prompt_tests_interface[] = [
  { name: 'Rejects unauthenticated', input: { user: null, prompt_id: 'any' } as any, check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); } },
];
