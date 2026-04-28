import OpenAI    from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { env }   from '@src/env';
import { log }   from '@setup/log';

export interface AiCallInput {
  model:           string;
  system_text:     string;
  user_message:    string;
  temperature:     number;
  max_tokens:      number;
  response_format: 'text' | 'json' | 'json_schema';
}

export interface AiCallOutput {
  text:       string;
  tokens_in:  number;
  tokens_out: number;
}

export interface StreamFinal {
  full_text:  string;
  tokens_in:  number;
  tokens_out: number;
}

export interface VisionCallInput {
  model:        string;
  system_text:  string;
  user_text:    string;
  image_buffer: Buffer;
  image_mime:   string;
  max_tokens:   number;
}

// ── Model capability table ───────────────────────────────────────────────────

type Provider   = 'openai' | 'anthropic';
type TokenParam = 'max_tokens' | 'max_completion_tokens';

interface ModelCaps {
  provider:             Provider;
  token_param:          TokenParam;
  supports_temperature: boolean;
  supports_system_msg:  boolean;  // false → inject system into user message
  supports_json_mode:   boolean;  // false → caller must request JSON in the prompt
}

const model_caps = (model: string): ModelCaps => {
  try {
    // Anthropic — all claude-* models
    if (model.startsWith('claude-')) return {
      provider: 'anthropic', token_param: 'max_tokens',
      supports_temperature: true, supports_system_msg: true, supports_json_mode: false,
    };

    // OpenAI o1-preview / o1-mini — no system msg, no temperature, no JSON mode
    if (model === 'o1-preview' || model === 'o1-mini') return {
      provider: 'openai', token_param: 'max_completion_tokens',
      supports_temperature: false, supports_system_msg: false, supports_json_mode: false,
    };

    // OpenAI o1 (full) / o3 family — no temperature, but system msg + JSON mode ok
    if (model.startsWith('o1') || model.startsWith('o3')) return {
      provider: 'openai', token_param: 'max_completion_tokens',
      supports_temperature: false, supports_system_msg: true, supports_json_mode: true,
    };

    // gpt-5 — max_completion_tokens, no temperature (only default 1 allowed)
    if (model.startsWith('gpt-5')) return {
      provider: 'openai', token_param: 'max_completion_tokens',
      supports_temperature: false, supports_system_msg: true, supports_json_mode: true,
    };

    // gpt-4.1 / gpt-4o — max_completion_tokens, temperature supported
    if (model.startsWith('gpt-4.1') || model.startsWith('gpt-4o')) return {
      provider: 'openai', token_param: 'max_completion_tokens',
      supports_temperature: true, supports_system_msg: true, supports_json_mode: true,
    };

    // OpenAI legacy (gpt-4, gpt-3.5-turbo, etc.)
    if (model.startsWith('gpt-')) return {
      provider: 'openai', token_param: 'max_tokens',
      supports_temperature: true, supports_system_msg: true, supports_json_mode: true,
    };

    log.warn('model_caps.unknown_model', { model });
    return {
      provider: 'openai', token_param: 'max_tokens',
      supports_temperature: true, supports_system_msg: true, supports_json_mode: false,
    };
  } catch (error) {
    log.error('model_caps.failed', { model, error: String((error as any)?.message ?? error) });
    throw error;
  }
};

// ── OpenAI ───────────────────────────────────────────────────────────────────

const build_openai_messages = (
  system_text:  string,
  user_message: string,
  caps:         ModelCaps,
): OpenAI.Chat.ChatCompletionMessageParam[] => {
  try {
    if (caps.supports_system_msg) {
      return [
        { role: 'system', content: system_text },
        { role: 'user',   content: user_message },
      ];
    }
    // No system role support — prepend system text into the user message
    return [{ role: 'user', content: `${system_text}\n\n${user_message}` }];
  } catch (error) {
    log.error('build_openai_messages.failed', { error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const call_openai = async (input: AiCallInput): Promise<AiCallOutput> => {
  try {
    const client     = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const caps       = model_caps(input.model);
    const wants_json = input.response_format === 'json' || input.response_format === 'json_schema';
    const messages   = build_openai_messages(input.system_text, input.user_message, caps);
    const token_param = caps.token_param === 'max_completion_tokens'
      ? { max_completion_tokens: input.max_tokens }
      : { max_tokens: input.max_tokens };

    const res = await client.chat.completions.create({
      model:    input.model,
      messages,
      ...token_param,
      ...(caps.supports_temperature ? { temperature: input.temperature } : {}),
      ...(wants_json && caps.supports_json_mode ? { response_format: { type: 'json_object' } } : {}),
    });

    return {
      text:       res.choices[0]?.message?.content ?? '',
      tokens_in:  res.usage?.prompt_tokens     ?? 0,
      tokens_out: res.usage?.completion_tokens ?? 0,
    };
  } catch (error: any) {
    log.error('ai_call.openai.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};

const call_openai_vision = async (input: VisionCallInput): Promise<AiCallOutput> => {
  try {
    const client      = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const caps        = model_caps(input.model);
    const b64         = input.image_buffer.toString('base64');
    const token_param = caps.token_param === 'max_completion_tokens'
      ? { max_completion_tokens: input.max_tokens }
      : { max_tokens: input.max_tokens };

    const res = await client.chat.completions.create({
      model: input.model,
      messages: [
        { role: 'system', content: input.system_text },
        { role: 'user',   content: [
          { type: 'text',      text: input.user_text },
          { type: 'image_url', image_url: { url: `data:${input.image_mime};base64,${b64}`, detail: 'high' } },
        ]},
      ],
      ...token_param,
      ...(caps.supports_temperature ? { temperature: 0.1 } : {}),
      ...(caps.supports_json_mode ? { response_format: { type: 'json_object' } } : {}),
    });

    return {
      text:       res.choices[0]?.message?.content ?? '',
      tokens_in:  res.usage?.prompt_tokens     ?? 0,
      tokens_out: res.usage?.completion_tokens ?? 0,
    };
  } catch (error: any) {
    log.error('ai_call.openai_vision.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};

// ── Anthropic ────────────────────────────────────────────────────────────────

const call_anthropic = async (input: AiCallInput): Promise<AiCallOutput> => {
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const res    = await client.messages.create({
      model:       input.model,
      max_tokens:  input.max_tokens,
      temperature: input.temperature,
      system:      input.system_text,
      messages:    [{ role: 'user', content: input.user_message }],
    });
    const text = res.content
      .filter(b => b.type === 'text')
      .map(b   => (b as any).text)
      .join('');
    return {
      text,
      tokens_in:  res.usage?.input_tokens  ?? 0,
      tokens_out: res.usage?.output_tokens ?? 0,
    };
  } catch (error: any) {
    log.error('ai_call.anthropic.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};

const call_anthropic_vision = async (input: VisionCallInput): Promise<AiCallOutput> => {
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const b64    = input.image_buffer.toString('base64');
    const res    = await client.messages.create({
      model:      input.model,
      max_tokens: input.max_tokens,
      system:     input.system_text,
      messages:   [{
        role:    'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: input.image_mime as any, data: b64 } },
          { type: 'text',  text: input.user_text },
        ],
      }],
    });
    const text = res.content.filter(b => b.type === 'text').map(b => (b as any).text).join('');
    return { text, tokens_in: res.usage?.input_tokens ?? 0, tokens_out: res.usage?.output_tokens ?? 0 };
  } catch (error: any) {
    log.error('ai_call.anthropic_vision.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};

// ── Streaming (OpenAI) ───────────────────────────────────────────────────────

const stream_openai = async function* (input: AiCallInput): AsyncGenerator<string, StreamFinal, void> {
  try {
    const client      = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const caps        = model_caps(input.model);
    const wants_json  = input.response_format === 'json' || input.response_format === 'json_schema';
    const messages    = build_openai_messages(input.system_text, input.user_message, caps);
    const token_param = caps.token_param === 'max_completion_tokens'
      ? { max_completion_tokens: input.max_tokens }
      : { max_tokens: input.max_tokens };

    const stream = await client.chat.completions.create({
      model:    input.model,
      messages,
      ...token_param,
      ...(caps.supports_temperature ? { temperature: input.temperature } : {}),
      ...(wants_json && caps.supports_json_mode ? { response_format: { type: 'json_object' } } : {}),
      stream:         true,
      stream_options: { include_usage: true },
    });

    let full_text  = '';
    let tokens_in  = 0;
    let tokens_out = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) { full_text += delta; yield delta; }
      if (chunk.usage) {
        tokens_in  = chunk.usage.prompt_tokens     ?? 0;
        tokens_out = chunk.usage.completion_tokens ?? 0;
      }
    }
    return { full_text, tokens_in, tokens_out };
  } catch (error: any) {
    log.error('ai_call.stream_openai.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};

// ── Streaming (Anthropic) ────────────────────────────────────────────────────

const stream_anthropic = async function* (input: AiCallInput): AsyncGenerator<string, StreamFinal, void> {
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const stream = client.messages.stream({
      model:       input.model,
      max_tokens:  input.max_tokens,
      temperature: input.temperature,
      system:      input.system_text,
      messages:    [{ role: 'user', content: input.user_message }],
    });

    let full_text = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && (event.delta as any)?.type === 'text_delta') {
        const delta: string = (event.delta as any).text ?? '';
        if (delta) { full_text += delta; yield delta; }
      }
    }
    const final = await stream.finalMessage();
    return {
      full_text,
      tokens_in:  final.usage?.input_tokens  ?? 0,
      tokens_out: final.usage?.output_tokens ?? 0,
    };
  } catch (error: any) {
    log.error('ai_call.stream_anthropic.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};

// ── Public API ───────────────────────────────────────────────────────────────

export const ai_call_stream = async function* (input: AiCallInput): AsyncGenerator<string, StreamFinal, void> {
  try {
    const caps = model_caps(input.model);
    if (caps.provider === 'anthropic') return yield* stream_anthropic(input);
    if (caps.provider === 'openai')    return yield* stream_openai(input);
    throw new Error(`Unknown provider for stream: ${input.model}`);
  } catch (error: any) {
    log.error('ai_call_stream.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};

export const ai_call = async (input: AiCallInput): Promise<AiCallOutput> => {
  try {
    const caps = model_caps(input.model);
    if (caps.provider === 'anthropic') return await call_anthropic(input);
    if (caps.provider === 'openai')    return await call_openai(input);
    throw new Error(`Unknown provider for model: ${input.model}`);
  } catch (error: any) {
    log.error('ai_call.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};

export const vision_call = async (input: VisionCallInput): Promise<AiCallOutput> => {
  try {
    const caps = model_caps(input.model);
    if (caps.provider === 'anthropic') return await call_anthropic_vision(input);
    if (caps.provider === 'openai')    return await call_openai_vision(input);
    throw new Error(`Unknown provider for vision call: ${input.model}`);
  } catch (error: any) {
    log.error('vision_call.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};
