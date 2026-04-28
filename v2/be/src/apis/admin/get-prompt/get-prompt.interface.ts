import { ExecutionResult } from '@setup/api/api.interface';
export interface get_prompt_function_params { user: any; prompt_id: string }
export type     get_prompt_function_return = ExecutionResult;
export interface get_prompt_tests_interface { name: string; input: get_prompt_function_params; check_output?: (i: any, o: any) => void }
