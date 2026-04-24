import axios, { AxiosInstance } from 'axios';
import { env } from '@src/env';

let http: AxiosInstance | undefined;

const get_http = (): AxiosInstance => {
  if (http) return http;
  http = axios.create({
    baseURL: `http://127.0.0.1:${env.PORT}`,
    timeout: 60_000,
    validateStatus: () => true,
  });
  return http;
};

type CallArgs = {
  method:      'get' | 'post' | 'put' | 'patch' | 'delete';
  path:        string;
  query?:      Record<string, unknown>;
  body?:       Record<string, unknown>;
  trace_id?:   string;
  session_id?: string;
};

export const call_api_internally = async (args: CallArgs): Promise<{ status: number; body: any }> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (args.trace_id) headers['X-Trace-Id'] = args.trace_id;
  if (args.session_id) headers['Cookie']   = `${env.SESSION_COOKIE_NAME}=${args.session_id}`;
  const response = await get_http().request({
    method:  args.method,
    url:     args.path,
    params:  args.query,
    data:    args.body,
    headers,
  });
  return { status: response.status, body: response.data };
};
