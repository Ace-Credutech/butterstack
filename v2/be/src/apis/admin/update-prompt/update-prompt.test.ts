import { update_prompt_tests_interface } from './update-prompt.interface';
export const update_prompt_tests: update_prompt_tests_interface[] = [
  { name: 'Rejects unauthenticated', input: { user: null, prompt_id: 'any' } as any, check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); } },
];
