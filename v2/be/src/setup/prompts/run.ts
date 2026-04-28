import { Prompt }        from '@models/prompt.model';
import { PromptVersion } from '@models/prompt-version.model';
import { PromptRun }     from '@models/prompt-run.model';
import type { PromptRunScopeType } from '@models/prompt-run.model';
import { ai_call }       from './ai-call';
import { log }           from '@setup/log';

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

const load_prompt_with_version = async (slug: string) => {
  try {
    const prompt = await Prompt.findOne({
      where: { slug, status: 'active' },
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

const log_prompt_run = async (
  prompt_id:         string,
  prompt_version_id: string,
  input:             RunPromptInput,
  user_message:      string,
  result:            { raw: string; parsed: unknown; tokens_in: number; tokens_out: number; latency_ms: number; model: string; run_id: string },
  status:            'success' | 'error',
  error_message?:    string,
): Promise<void> => {
  try {
    await PromptRun.create({
      id:                result.run_id,
      prompt_id,
      prompt_version_id,
      scope_type:        input.scope_type ?? 'system',
      scope_id:          input.scope_id   ?? null,
      user_id:           input.user_id    ?? null,
      input_payload:     { variables: input.variables, user_message } as object,
      output_text:       result.raw   || null,
      output_parsed:     result.parsed ? (result.parsed as object) : null,
      model_used:        result.model,
      tokens_in:         result.tokens_in,
      tokens_out:        result.tokens_out,
      latency_ms:        result.latency_ms,
      status,
      error_message:     error_message ?? null,
      trace_id:          input.trace_id ?? null,
    });
  } catch (err) {
    // best-effort: logging failure must never break the caller
    log.error('run_prompt.log_run.failed', { prompt_id, error: String((err as any)?.message ?? err) });
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

export const run_prompt = async <T = unknown>(input: RunPromptInput): Promise<RunPromptResult<T>> => {
  try {
    const { prompt, version } = await load_prompt_with_version(input.slug);
    const user_message        = interpolate_template(version.user_template, input.variables);
    const run_id              = make_run_id();
    const started_at          = Date.now();

    let ai_result: Awaited<ReturnType<typeof ai_call>>;
    let status: 'success' | 'error' = 'success';
    let error_message: string | undefined;
    let parsed: T | undefined;

    try {
      ai_result = await ai_call({
        model:           version.model,
        system_text:     version.system_text,
        user_message,
        temperature:     version.temperature   ?? 0.7,
        max_tokens:      version.max_tokens    ?? 2000,
        response_format: version.response_format ?? 'text',
      });
      parsed = parse_response<T>(ai_result.text, version.response_format ?? 'text');
    } catch (err) {
      status        = 'error';
      error_message = String((err as any)?.message ?? err);
      ai_result     = { text: '', tokens_in: 0, tokens_out: 0 };
      log.error('run_prompt.ai_call.failed', { slug: input.slug, error: error_message });
      void log_prompt_run(prompt.id, version.id, input, user_message,
        { raw: '', parsed: null, tokens_in: 0, tokens_out: 0, latency_ms: Date.now() - started_at, model: version.model, run_id },
        'error', error_message,
      );
      throw err;
    }

    const latency_ms = Date.now() - started_at;

    void log_prompt_run(prompt.id, version.id, input, user_message,
      { raw: ai_result.text, parsed: parsed ?? null, tokens_in: ai_result.tokens_in, tokens_out: ai_result.tokens_out, latency_ms, model: version.model, run_id },
      status, error_message,
    );

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
