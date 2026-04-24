import { Transaction } from 'sequelize';
import { z, ZodObject, ZodRawShape } from 'zod';
import { Error_Interface } from '@config/interfaces/error.interface';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type ExecutionContext<Q, B> = Q & B & {
  user:     any;
  trace_id: string;
};

export type CookieSpec = {
  name:    string;
  value:   string;
  signed?: boolean;
  options?: { httpOnly?: boolean; secure?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; maxAge?: number; path?: string; clear?: boolean };
};

export type ExecutionResult = {
  code:     number;
  message:  string;
  data?:    any;
  headers?: Record<string, string>;
  cookies?: CookieSpec[];
};

export type ExecutionFunction<Q, B> = (
  data:        ExecutionContext<Q, B>,
  transaction: Transaction,
) => Promise<ExecutionResult | Error_Interface>;

export type TestCase<Q, B> = {
  name:          string;
  input:         Partial<ExecutionContext<Q, B>>;
  check_output?: (input: any, output: any) => void;
};

export type ApiDetails<QS extends ZodRawShape = ZodRawShape, BS extends ZodRawShape = ZodRawShape> = {
  module:               string;
  sub_module?:          string;
  api_name:             string;
  api_description:      string;
  method:               HttpMethod;
  path:                 string;
  query_schema:         ZodObject<QS>;
  body_schema:          ZodObject<BS>;
  execution_function:   ExecutionFunction<z.infer<ZodObject<QS>>, z.infer<ZodObject<BS>>>;
  tests:                TestCase<any, any>[];
  roles:                string[];
  required_permissions?: string[];
  allow_extra_keys?:    boolean;
  uses_transaction?:    boolean;
};
