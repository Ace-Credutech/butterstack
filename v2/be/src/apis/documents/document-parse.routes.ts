import { Context } from 'hono';
import { app }                  from '@setup/hono';
import { get_object }           from '@setup/storage';
import { run_prompt, create_pending_run, complete_run } from '@setup/prompts/run';
import { vision_call }          from '@setup/prompts/ai-call';
import { broadcast_to_user, broadcast_to_org, broadcast_to_project } from '@setup/ws/ws-server';
import { env }                  from '@src/env';
import { log }                  from '@setup/log';
import { Document }             from '@models/document.model';
import { DocumentPassage }      from '@models/document-passage.model';
import { DocumentPassageLink }  from '@models/document-passage-link.model';
import { DocumentEntity }       from '@models/document-entity.model';
import { Prompt }               from '@models/prompt.model';
import { PromptVersion }        from '@models/prompt-version.model';
import { PromptRun }            from '@models/prompt-run.model';
import { sequelize }            from '@setup/sequelize';

const BUCKET          = env.MINIO_BUCKET_NAME ?? 'butterstack';
const EXTRACT_SLUG    = 'document.extract';
const DEFAULT_MODEL   = 'gpt-4.1';
const DEFAULT_TOKENS  = 4000;

interface PassageLink { to_idx: number; link_type: string }

interface ExtractResult {
  ai_name:        string;
  ai_summary:     string;
  extracted_text: string;
  passages:       Array<{ idx: number; type: string; heading?: string; text: string; keywords?: string[]; links?: PassageLink[] }>;
  entities:       Array<{ name: string; type: string }>;
  keywords:       string[];
}

const ok  = (c: Context, data: unknown) => c.json({ code: 200, message: 'ok', data }, 200);
const err = (c: Context, code: number, message: string) => c.json({ code, message }, code as any);

const is_text_mime  = (mime: string): boolean =>
  mime.startsWith('text/') || mime.includes('json') || mime.includes('xml') || mime.includes('csv') || mime.includes('markdown');

const is_image_mime = (mime: string): boolean => mime.startsWith('image/');

interface ExtractPrompt { prompt_id: string; version_id: string; system_text: string; user_template: string; model: string; max_tokens: number }

const load_extract_prompt = async (): Promise<ExtractPrompt> => {
  try {
    const prompt = await Prompt.findOne({
      where:   { slug: EXTRACT_SLUG, status: 'active' },
      include: [{ model: PromptVersion, as: 'current_version' }],
    });
    const version = (prompt as any)?.current_version as PromptVersion | null;
    if (!version) throw new Error(`Prompt ${EXTRACT_SLUG} not found or has no active version`);
    return {
      prompt_id:     (prompt as any).id,
      version_id:    version.id,
      system_text:   version.system_text,
      user_template: version.user_template,
      model:         version.model      ?? DEFAULT_MODEL,
      max_tokens:    version.max_tokens ?? DEFAULT_TOKENS,
    };
  } catch (error) {
    log.error('document_parse.load_extract_prompt.failed', { error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const interpolate = (template: string, vars: Record<string, string>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');

const strip_and_parse = (raw: string): ExtractResult => {
  try {
    const trimmed = raw.trim();
    const fenced  = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
    return JSON.parse(fenced ? (fenced[1] ?? trimmed).trim() : trimmed) as ExtractResult;
  } catch (error) {
    log.error('document_parse.strip_and_parse.failed', { error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const extract_via_text_ai = async (doc: Document, content_text: string, uploaded_by: string): Promise<ExtractResult> => {
  try {
    const result = await run_prompt<ExtractResult>({
      slug:       EXTRACT_SLUG,
      variables:  { filename: doc.filename, content: content_text.slice(0, 30_000) },
      scope_type: 'document',
      scope_id:   doc.id,
      user_id:    uploaded_by,
    });
    return result.data;
  } catch (error) {
    log.error('document_parse.extract_via_text_ai.failed', { document_id: doc.id, error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const extract_via_vision_ai = async (doc: Document, file_buffer: Buffer, uploaded_by: string): Promise<ExtractResult> => {
  const started_at = Date.now();
  const run_id     = crypto.randomUUID();
  let prompt_id = '', version_id = '', model = DEFAULT_MODEL, user_text = '';
  try {
    const extracted = await load_extract_prompt();
    prompt_id  = extracted.prompt_id;
    version_id = extracted.version_id;
    model      = extracted.model;
    user_text  = interpolate(extracted.user_template, {
      filename: doc.filename,
      content:  '[Binary file — content is in the attached image above]',
    });
    const input_payload = { system_text: extracted.system_text, variables: { filename: doc.filename }, user_message: user_text };

    await create_pending_run({ run_id, prompt_id, prompt_version_id: version_id, model, scope_type: 'document', scope_id: doc.id, user_id: uploaded_by, input_payload });
    void broadcast_to_user(uploaded_by, { type: 'run.started', payload: { run_id, scope_id: doc.id, model, prompt_slug: EXTRACT_SLUG, status: 'pending', input_payload, created_at: new Date().toISOString() } });

    const result      = await vision_call({ model, system_text: extracted.system_text, user_text, image_buffer: file_buffer, image_mime: doc.mime_type, max_tokens: extracted.max_tokens });
    const latency_ms  = Date.now() - started_at;

    // Parse BEFORE marking success — if strip_and_parse throws, the run must be logged as error
    const extract_result = strip_and_parse(result.text);
    const parsed_out     = result.text ? (() => { try { return JSON.parse(result.text); } catch { return null; } })() : null;

    void complete_run({ run_id, output_text: result.text || null, output_parsed: parsed_out, tokens_in: result.tokens_in, tokens_out: result.tokens_out, latency_ms, status: 'success' });
    void broadcast_to_user(uploaded_by, { type: 'run.completed', payload: { run_id, scope_id: doc.id, model, status: 'success', tokens_in: result.tokens_in, tokens_out: result.tokens_out, latency_ms, output_text: result.text, error_message: null } });

    return extract_result;
  } catch (error: any) {
    const latency_ms = Date.now() - started_at;
    const error_msg  = String(error?.message ?? error);
    void complete_run({ run_id, output_text: null, output_parsed: null, tokens_in: 0, tokens_out: 0, latency_ms, status: 'error', error_message: error_msg });
    void broadcast_to_user(uploaded_by, { type: 'run.completed', payload: { run_id, scope_id: doc.id, model, status: 'error', tokens_in: 0, tokens_out: 0, latency_ms, output_text: null, error_message: error_msg } });
    log.error('document_parse.extract_via_vision_ai.failed', { document_id: doc.id, error: error_msg });
    throw error;
  }
};

const build_idx_map = (passages: DocumentPassage[]): Map<number, string> => {
  const map = new Map<number, string>();
  for (const p of passages) map.set(p.idx, p.id);
  return map;
};

const collect_passage_links = (
  result: ExtractResult,
  idx_map: Map<number, string>,
): Array<{ from_passage_id: string; to_passage_id: string; link_type: string }> => {
  const links: Array<{ from_passage_id: string; to_passage_id: string; link_type: string }> = [];
  for (const p of result.passages) {
    if (!p.links?.length) continue;
    const from_id = idx_map.get(p.idx);
    if (!from_id) continue;
    for (const link of p.links) {
      const to_id = idx_map.get(link.to_idx);
      if (!to_id || to_id === from_id) continue;
      links.push({ from_passage_id: from_id, to_passage_id: to_id, link_type: link.link_type as any });
    }
  }
  return links;
};

const save_parse_results = async (doc: Document, result: ExtractResult): Promise<void> => {
  try {
    const tx = await sequelize.transaction();
    try {
      await DocumentPassage.destroy({ where: { document_id: doc.id }, transaction: tx });
      await DocumentEntity.destroy({ where: { document_id: doc.id }, transaction: tx });

      const saved_passages = result.passages.length > 0
        ? await DocumentPassage.bulkCreate(
            result.passages.map((p, fallback_idx) => ({
              document_id: doc.id,
              idx:         p.idx ?? fallback_idx,
              type:        (p.type || 'other') as any,
              heading:     p.heading || null,
              text:        p.text,
              keywords:    p.keywords ?? [],
            })),
            { transaction: tx, returning: true },
          )
        : [];

      const idx_map     = build_idx_map(saved_passages);
      const link_rows   = collect_passage_links(result, idx_map);
      if (link_rows.length > 0) {
        await DocumentPassageLink.bulkCreate(link_rows as any[], { transaction: tx, ignoreDuplicates: true });
      }

      if (result.entities.length > 0) {
        await DocumentEntity.bulkCreate(
          result.entities.map(e => ({
            document_id: doc.id,
            name:        e.name,
            type:        (e.type || 'other') as any,
          })),
          { transaction: tx },
        );
      }

      await doc.update({
        parse_status: 'parsed',
        parsed_text:  result.extracted_text || null,
        ai_name:      result.ai_name        || null,
        ai_summary:   result.ai_summary     || null,
        keywords:     result.keywords       ?? [],
        parse_error:  null,
      }, { transaction: tx });

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (error) {
    log.error('document_parse.save_results.failed', { document_id: doc.id, error: String((error as any)?.message ?? error) });
    throw error;
  }
};

const mark_failed = async (doc: Document, error_message: string): Promise<void> => {
  try {
    await doc.update({ parse_status: 'failed', parse_error: error_message });
  } catch (e) {
    log.error('document_parse.mark_failed.error', { document_id: doc.id, error: String((e as any)?.message ?? e) });
  }
};

const broadcast_result = async (
  doc: Document,
  entity_type: string,
  entity_id: string,
  uploaded_by: string,
  passage_count: number,
): Promise<void> => {
  try {
    const event = {
      type:    'document.parsed',
      payload: {
        document_id:   doc.id,
        entity_type,
        entity_id,
        parse_status:  doc.parse_status,
        ai_name:       doc.ai_name,
        ai_summary:    doc.ai_summary,
        parse_error:   doc.parse_error ?? null,
        passage_count,
        keyword_count: (doc.keywords ?? []).length,
      },
    };
    await broadcast_to_user(uploaded_by, event);
    if (entity_type === 'org')     await broadcast_to_org(entity_id, event);
    if (entity_type === 'project') await broadcast_to_project(entity_id, event);
  } catch (error) {
    // best-effort: broadcast failure must not break the parse result
    log.error('document_parse.broadcast.failed', { document_id: doc.id, error: String((error as any)?.message ?? error) });
  }
};

const parse_document = async (c: Context) => {
  let doc: Document | null = null;
  try {
    const body        = await c.req.json() as { document_id: string; entity_type: string; entity_id: string; uploaded_by: string };
    const { document_id, entity_type, entity_id, uploaded_by } = body;

    doc = await Document.findByPk(document_id);
    if (!doc) return err(c, 404, 'Document not found');
    if (doc.parse_status !== 'pending') return ok(c, { document_id, skipped: true });

    const file_buffer = await get_object(BUCKET, doc.storage_key);

    let extract_result: ExtractResult;
    if (is_text_mime(doc.mime_type)) {
      const content_text = file_buffer.toString('utf-8');
      extract_result     = await extract_via_text_ai(doc, content_text, uploaded_by);
    } else {
      extract_result = await extract_via_vision_ai(doc, file_buffer, uploaded_by);
    }

    await save_parse_results(doc, extract_result);
    await doc.reload();

    await broadcast_result(doc, entity_type, entity_id, uploaded_by, extract_result.passages.length);

    return ok(c, { document_id, parse_status: doc.parse_status, passage_count: extract_result.passages.length });
  } catch (error) {
    log.error('document_parse.failed', { document_id: doc?.id, error: String((error as any)?.message ?? error) });
    if (doc) await mark_failed(doc, String((error as any)?.message ?? error));
    if (doc) await broadcast_result(doc, '', '', '', 0);
    return err(c, 500, 'Parse failed');
  }
};

export const register_document_parse_routes = () => {
  app.post('/api/internal/document-parse', parse_document);
};
