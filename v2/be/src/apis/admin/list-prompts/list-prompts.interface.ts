import { ExecutionResult } from '@setup/api/api.interface';

export interface list_prompts_function_params { user: any }
export type     list_prompts_function_return = ExecutionResult;
export interface list_prompts_tests_interface { name: string; input: list_prompts_function_params; check_output?: (i: any, o: any) => void }
