import { Prompt }        from '@models/prompt.model';
import { PromptVersion } from '@models/prompt-version.model';
import { PromptRun }     from '@models/prompt-run.model';
import type { PromptRunScopeType } from '@models/prompt-run.model';
import { ai_call }           from './ai-call';
import { log }               from '@setup/log';
import { broadcast_to_user } from '@setup/ws/ws-server';

export interface RunPromptInput {
  slug:        string;
  variables:   Record<string, unknown>;
  scope_type?: PromptRunScopeType;
  scope_id?:   string;
  user_id?:    string;
  trace_id?:   string;
}

export interface RunPromptResult<T = unknown> {
  data:       T;
  raw:        string;
  tokens_in:  number;
  tokens_out: number;
  latency_ms: number;
  model:      string;
  run_id:     string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const load_prompt_with_version = async (slug: string) => {
  try {
    const prompt = await Prompt.findOne({
      where:   { slug, status: 'active' },
      include: [{ model: PromptVersion, as: 'current_version' }],
    });
    if (!prompt) throw new Error(`Prompt not found: ${slug}`);
    const version = (prompt as any).current_version as PromptVersion | null;
    if (!version)  throw new Error(`Prompt has no active version: ${slug}`);
    return { prompt, version };
  } catch (error) {
    log.error('run_prompt.load_prompt.failed', { slug, error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const interpolate_template = (template: string, variables: Record<string, unknown>): string => {
  try {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = variables[key];
      if (val === undefined || val === null) return '';
      return typeof val === 'object' ? JSON.stringify(val) : String(val);
    });
  } catch (error) {
    log.error('run_prompt.interpolate.failed', { error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const strip_code_fences = (raw: string): string => {
  try {
    const trimmed = raw.trim();
    const fenced  = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
    return fenced ? (fenced[1] ?? trimmed).trim() : trimmed;
  } catch (error) {
    log.error('run_prompt.strip_fences.failed', { error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const parse_response = <T>(raw: string, response_format: string): T => {
  try {
    const wants_json = response_format === 'json' || response_format === 'json_schema';
    if (!wants_json) return raw as unknown as T;
    const clean = strip_code_fences(raw);
    return JSON.parse(clean) as T;
  } catch (error) {
    log.error('run_prompt.parse_response.failed', { response_format, error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const make_run_id = (): string => {
  try {
    return crypto.randomUUID();
  } catch (error) {
    log.error('run_prompt.make_run_id.failed', { error: String((error as any)?.message ?? error) });
    throw error;
  }
};

// ── Run lifecycle: create pending → complete ──────────────────────────────────

export interface PendingRunParams {
  run_id:            string;
  prompt_id:         string;
  prompt_version_id: string;
  model:             string;
  scope_type:        PromptRunScopeType;
  scope_id:          string | null;
  user_id:           string | null;
  input_payload:     object;
  trace_id?:         string | null;
}

export const create_pending_run = async (params: PendingRunParams): Promise<void> => {
  try {
    await PromptRun.create({
      id:                params.run_id,
      prompt_id:         params.prompt_id,
      prompt_version_id: params.prompt_version_id,
      scope_type:        params.scope_type,
      scope_id:          params.scope_id,
      user_id:           params.user_id,
      input_payload:     params.input_payload,
      model_used:        params.model,
      status:            'pending',
      trace_id:          params.trace_id ?? null,
    });
  } catch (err) {
    // best-effort — logging failure must never break the caller
    log.error('create_pending_run.failed', { run_id: params.run_id, error: String((err as any)?.message ?? err) });
  }
};

export interface CompleteRunParams {
  run_id:         string;
  output_text:    string | null;
  output_parsed:  unknown;
  tokens_in:      number;
  tokens_out:     number;
  latency_ms:     number;
  status:         'success' | 'error';
  error_message?: string;
}

export const complete_run = async (params: CompleteRunParams): Promise<void> => {
  try {
    await PromptRun.update({
      output_text:   params.output_text,
      output_parsed: params.output_parsed ? (params.output_parsed as object) : null,
      tokens_in:     params.tokens_in,
      tokens_out:    params.tokens_out,
      latency_ms:    params.latency_ms,
      status:        params.status,
      error_message: params.error_message ?? null,
    }, { where: { id: params.run_id } });
  } catch (err) {
    log.error('complete_run.failed', { run_id: params.run_id, error: String((err as any)?.message ?? err) });
  }
};

// ── WS broadcasts ─────────────────────────────────────────────────────────────

const broadcast_run_started = (user_id: string | undefined, run_id: string, scope_id: string | undefined, model: string, slug: string, input_payload: object): void => {
  try {
    if (!user_id) return;
    void broadcast_to_user(user_id, {
      type:    'run.started',
      payload: { run_id, scope_id: scope_id ?? null, model, prompt_slug: slug, status: 'pending', input_payload, created_at: new Date().toISOString() },
    });
  } catch (error) {
    log.error('broadcast_run_started.failed', { run_id, error: String((error as any)?.message ?? error) });
  }
};

const broadcast_run_completed = (
  user_id: string | undefined, run_id: string, scope_id: string | undefined, model: string,
  status: 'success' | 'error', tokens_in: number, tokens_out: number, latency_ms: number,
  output_text: string | null, error_message: string | undefined,
): void => {
  try {
    if (!user_id) return;
    void broadcast_to_user(user_id, {
      type:    'run.completed',
      payload: { run_id, scope_id: scope_id ?? null, model, status, tokens_in, tokens_out, latency_ms, output_text, error_message: error_message ?? null },
    });
  } catch (error) {
    log.error('broadcast_run_completed.failed', { run_id, error: String((error as any)?.message ?? error) });
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

export const run_prompt = async <T = unknown>(input: RunPromptInput): Promise<RunPromptResult<T>> => {
  try {
    const { prompt, version } = await load_prompt_with_version(input.slug);
    const user_message        = interpolate_template(version.user_template, input.variables);
    const run_id              = make_run_id();
    const started_at          = Date.now();
    const input_payload       = { system_text: version.system_text, variables: input.variables, user_message };

    // Insert pending run immediately so it appears in the UI before the AI call
    await create_pending_run({
      run_id,
      prompt_id:         prompt.id,
      prompt_version_id: version.id,
      model:             version.model,
      scope_type:        input.scope_type ?? 'system',
      scope_id:          input.scope_id   ?? null,
      user_id:           input.user_id    ?? null,
      input_payload,
      trace_id:          input.trace_id   ?? null,
    });
    broadcast_run_started(input.user_id, run_id, input.scope_id, version.model, input.slug, input_payload);

    let ai_result: Awaited<ReturnType<typeof ai_call>>;

    try {
      ai_result = await ai_call({
        model:           version.model,
        system_text:     version.system_text,
        user_message,
        temperature:     version.temperature   ?? 0.7,
        max_tokens:      version.max_tokens    ?? 2000,
        response_format: version.response_format ?? 'text',
      });
    } catch (err) {
      const latency_ms  = Date.now() - started_at;
      const error_msg   = String((err as any)?.message ?? err);
      log.error('run_prompt.ai_call.failed', { slug: input.slug, error: error_msg });
      void complete_run({ run_id, output_text: null, output_parsed: null, tokens_in: 0, tokens_out: 0, latency_ms, status: 'error', error_message: error_msg });
      broadcast_run_completed(input.user_id, run_id, input.scope_id, version.model, 'error', 0, 0, latency_ms, null, error_msg);
      throw err;
    }

    let parsed: T | undefined;

    try {
      parsed = parse_response<T>(ai_result.text, version.response_format ?? 'text');
    } catch (err) {
      // AI responded but JSON was malformed/truncated — log real token counts
      const latency_ms  = Date.now() - started_at;
      const error_msg   = String((err as any)?.message ?? err);
      log.error('run_prompt.parse_response.failed', { slug: input.slug, error: error_msg });
      void complete_run({ run_id, output_text: ai_result.text, output_parsed: null, tokens_in: ai_result.tokens_in, tokens_out: ai_result.tokens_out, latency_ms, status: 'error', error_message: error_msg });
      broadcast_run_completed(input.user_id, run_id, input.scope_id, version.model, 'error', ai_result.tokens_in, ai_result.tokens_out, latency_ms, ai_result.text, error_msg);
      throw err;
    }

    const latency_ms = Date.now() - started_at;
    void complete_run({ run_id, output_text: ai_result.text, output_parsed: parsed ?? null, tokens_in: ai_result.tokens_in, tokens_out: ai_result.tokens_out, latency_ms, status: 'success' });
    broadcast_run_completed(input.user_id, run_id, input.scope_id, version.model, 'success', ai_result.tokens_in, ai_result.tokens_out, latency_ms, ai_result.text, undefined);

    return {
      data:       parsed as T,
      raw:        ai_result.text,
      tokens_in:  ai_result.tokens_in,
      tokens_out: ai_result.tokens_out,
      latency_ms,
      model:      version.model,
      run_id,
    };
  } catch (error) {
    log.error('run_prompt.failed', { slug: input.slug, error: String((error as any)?.message ?? error) });
    throw error;
  }
};
