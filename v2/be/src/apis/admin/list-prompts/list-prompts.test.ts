import { list_prompts_tests_interface } from './list-prompts.interface';
export const list_prompts_tests: list_prompts_tests_interface[] = [
  { name: 'Rejects unauthenticated', input: { user: null } as any, check_output: (_i, o) => { if (o.code !== 401) throw new Error('expected 401'); } },
];
