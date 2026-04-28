import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@src/env';
import { log } from '@setup/log';

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

const is_anthropic = (model: string): boolean => model.startsWith('claude');
const is_openai    = (model: string): boolean => model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3');

const call_openai = async (input: AiCallInput): Promise<AiCallOutput> => {
  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const wants_json = input.response_format === 'json' || input.response_format === 'json_schema';
    const res = await client.chat.completions.create({
      model:       input.model,
      temperature: input.temperature,
      max_tokens:  input.max_tokens,
      messages: [
        { role: 'system', content: input.system_text },
        { role: 'user',   content: input.user_message },
      ],
      ...(wants_json ? { response_format: { type: 'json_object' } } : {}),
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

const call_anthropic = async (input: AiCallInput): Promise<AiCallOutput> => {
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model:       input.model,
      max_tokens:  input.max_tokens,
      temperature: input.temperature,
      system:      input.system_text,
      messages:    [{ role: 'user', content: input.user_message }],
    });
    const text = res.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
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

export interface VisionCallInput {
  model:        string;
  system_text:  string;
  user_text:    string;
  image_buffer: Buffer;
  image_mime:   string;
  max_tokens:   number;
}

const call_openai_vision = async (input: VisionCallInput): Promise<AiCallOutput> => {
  try {
    const client  = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const b64     = input.image_buffer.toString('base64');
    const res = await client.chat.completions.create({
      model:      input.model,
      max_tokens: input.max_tokens,
      messages: [
        { role: 'system', content: input.system_text },
        { role: 'user', content: [
          { type: 'text',      text: input.user_text },
          { type: 'image_url', image_url: { url: `data:${input.image_mime};base64,${b64}`, detail: 'high' } },
        ]},
      ],
      response_format: { type: 'json_object' },
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

const call_anthropic_vision = async (input: VisionCallInput): Promise<AiCallOutput> => {
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const b64    = input.image_buffer.toString('base64');
    const res = await client.messages.create({
      model:      input.model,
      max_tokens: input.max_tokens,
      system:     input.system_text,
      messages: [{
        role: 'user',
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

export const vision_call = async (input: VisionCallInput): Promise<AiCallOutput> => {
  try {
    if (is_anthropic(input.model)) return await call_anthropic_vision(input);
    if (is_openai(input.model))    return await call_openai_vision(input);
    throw new Error(`Unknown model provider for vision call: ${input.model}`);
  } catch (error: any) {
    log.error('vision_call.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};

export const ai_call = async (input: AiCallInput): Promise<AiCallOutput> => {
  try {
    if (is_anthropic(input.model)) return await call_anthropic(input);
    if (is_openai(input.model))    return await call_openai(input);
    throw new Error(`Unknown model provider for model: ${input.model}`);
  } catch (error: any) {
    log.error('ai_call.failed', { model: input.model, error: String(error?.message ?? error) });
    throw error;
  }
};
