import { query } from '../db.ts'

type LoggableResult = {
  model:       string
  promptSent?: string
  cleanPrompt?: string
  responseRaw?: string
  tokensIn:    number
  tokensOut:   number
  durationMs:  number
}

export function logOpenAI(endpoint: string, result: LoggableResult, status = 'success', error?: string): void {
  query(
    `INSERT INTO openai_logs
      (endpoint, model, prompt_sent, response_raw, tokens_in, tokens_out, tokens_total, duration_ms, status, error_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      endpoint,
      result.model,
      result.promptSent ?? result.cleanPrompt ?? null,
      result.responseRaw ?? null,
      result.tokensIn,
      result.tokensOut,
      result.tokensIn + result.tokensOut,
      result.durationMs,
      status,
      error ?? null,
    ]
  ).catch((err) => console.error('[openai_log]', err.message))
}

export function logInternal(
  endpoint:     string,
  requestBody:  unknown,
  responseBody: unknown,
  durationMs:   number,
  status  = 'success',
  error?: string
): void {
  const { title, description } = (requestBody ?? {}) as Record<string, string>
  query(
    `INSERT INTO internal_api_logs
      (endpoint, method, title, description, request_body, response_body, duration_ms, status, error_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      endpoint, 'POST',
      title       ?? null,
      description ?? null,
      JSON.stringify(requestBody),
      JSON.stringify(responseBody),
      durationMs,
      status,
      error ?? null,
    ]
  ).catch((err) => console.error('[internal_log]', err.message))
}
