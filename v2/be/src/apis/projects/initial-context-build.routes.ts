import { Context } from 'hono';
import { app }                       from '@setup/hono';
import { run_prompt }                from '@setup/prompts/run';
import { broadcast_to_project }      from '@setup/ws/ws-server';
import { log }                       from '@setup/log';
import { Project }                   from '@models/project.model';
import { Document }                  from '@models/document.model';
import { DocumentLink }              from '@models/document-link.model';
import { DocumentPassage }           from '@models/document-passage.model';
import { ProjectInitialContext }     from '@models/project-initial-context.model';
import type { InitialContextPayload } from '@models/project-initial-context.model';
import { sequelize }                 from '@setup/sequelize';

const PROMPT_SLUG    = 'project.initial-context';
const MAX_TEXT_CHARS = 8000;

const ok  = (c: Context, data: unknown) => c.json({ code: 200, message: 'ok', data }, 200);
const err = (c: Context, code: number, message: string) => c.json({ code, message }, code as any);

const fetch_project = async (project_id: string) => Project.findByPk(project_id);

const fetch_project_documents = async (project_id: string): Promise<Document[]> => {
  const links = await DocumentLink.findAll({
    where:   { entity_type: 'project', entity_id: project_id },
    include: [{ model: Document, as: 'document' }],
    order:   [['created_at', 'ASC']],
  });
  return links
    .map(l => (l as any).document as Document | null)
    .filter((d): d is Document => !!d);
};

const fetch_document_text = async (doc: Document): Promise<string> => {
  if (doc.parsed_text) return doc.parsed_text;
  // Fall back to passages if parsed_text was not stored verbatim
  const passages = await DocumentPassage.findAll({ where: { document_id: doc.id }, order: [['idx', 'ASC']] });
  return passages.map(p => p.text).join('\n');
};

const build_sources_block = async (docs: Document[]): Promise<string> => {
  const blocks: string[] = [];
  for (const doc of docs) {
    const text = await fetch_document_text(doc);
    const truncated = text.length > MAX_TEXT_CHARS
      ? text.slice(0, MAX_TEXT_CHARS) + `\n…[truncated, ${text.length - MAX_TEXT_CHARS} more chars]`
      : text;
    blocks.push(`---\nid: ${doc.id}\nfilename: ${doc.filename}\nkind: ${doc.kind}\nmime: ${doc.mime_type}\n---\n${truncated || '[empty / not yet parsed]'}\n`);
  }
  return blocks.length ? blocks.join('\n') : '[no documents — only the brief is available]';
};

const ensure_row = async (project_id: string): Promise<ProjectInitialContext> => {
  const [row] = await ProjectInitialContext.findOrCreate({
    where:    { project_id },
    defaults: { project_id, status: 'pending' } as any,
  });
  return row;
};

const should_skip = (row: ProjectInitialContext): boolean => row.status === 'ready' || row.status === 'building';

const mark_building = async (row: ProjectInitialContext): Promise<void> => {
  await row.update({ status: 'building', error_message: null });
};

const escape_md = (s: string): string => s.replace(/[\r\n]+/g, ' ').trim();

const build_markdown = (payload: InitialContextPayload): string => {
  const lines: string[] = [];
  lines.push(`# ${payload.title}`);
  lines.push('');
  lines.push(payload.summary);
  lines.push('');
  for (const section of payload.sections ?? []) {
    lines.push(`## ${section.heading}`);
    for (const bullet of section.bullets ?? []) {
      const refs = bullet.source_document_ids?.length
        ? ` _(sources: ${bullet.source_document_ids.map(id => `\`${id.slice(0, 8)}\``).join(', ')})_`
        : '';
      lines.push(`- ${escape_md(bullet.text)}${refs}`);
    }
    lines.push('');
  }
  if (payload.open_questions?.length) {
    lines.push('## Open questions');
    for (const q of payload.open_questions) lines.push(`- ${escape_md(q)}`);
    lines.push('');
  }
  if (payload.glossary?.length) {
    lines.push('## Glossary');
    for (const g of payload.glossary) lines.push(`- **${escape_md(g.term)}** — ${escape_md(g.definition)}`);
    lines.push('');
  }
  return lines.join('\n');
};

const persist_ready = async (
  row: ProjectInitialContext,
  payload: InitialContextPayload,
  markdown: string,
  prompt_run_id: string,
): Promise<void> => {
  const tx = await sequelize.transaction();
  try {
    await row.update({
      status:        'ready',
      json_payload:  payload,
      markdown_text: markdown,
      prompt_run_id,
      generated_at:  new Date(),
      error_message: null,
    }, { transaction: tx });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
};

const mark_failed = async (row: ProjectInitialContext, message: string): Promise<void> => {
  try { await row.update({ status: 'failed', error_message: message }); }
  catch (e) { log.error('initial_context.mark_failed.error', { project_id: row.project_id, error: String((e as any)?.message ?? e) }); }
};

const broadcast_state = async (project_id: string, status: string, error_message: string | null): Promise<void> => {
  try {
    await broadcast_to_project(project_id, {
      type:    'project.initial-context.status',
      payload: { project_id, status, error_message },
    });
  } catch (e) {
    log.error('initial_context.broadcast.failed', { project_id, error: String((e as any)?.message ?? e) });
  }
};

const build_initial_context = async (c: Context) => {
  let row: ProjectInitialContext | null = null;
  let project_id = '';
  try {
    const body = await c.req.json() as { project_id: string; user_id: string };
    project_id = body.project_id;

    const project = await fetch_project(project_id);
    if (!project) return err(c, 404, 'Project not found');

    row = await ensure_row(project_id);
    if (should_skip(row)) return ok(c, { project_id, skipped: true, status: row.status });

    await mark_building(row);
    await broadcast_state(project_id, 'building', null);

    const docs          = await fetch_project_documents(project_id);
    const sources_block = await build_sources_block(docs);

    const result = await run_prompt<InitialContextPayload>({
      slug:       PROMPT_SLUG,
      variables:  {
        project_name:  project.name,
        project_brief: project.brief ?? '',
        sources_block,
      },
      scope_type: 'project',
      scope_id:   project_id,
      user_id:    body.user_id,
    });

    const markdown = build_markdown(result.data);
    await persist_ready(row, result.data, markdown, result.run_id);
    await broadcast_state(project_id, 'ready', null);

    return ok(c, { project_id, status: 'ready', run_id: result.run_id });
  } catch (error: any) {
    const msg = String(error?.message ?? error);
    log.error('initial_context.build.failed', { project_id, error: msg });
    if (row) await mark_failed(row, msg);
    if (project_id) await broadcast_state(project_id, 'failed', msg);
    return err(c, 500, 'Initial context build failed');
  }
};

export const register_initial_context_build_routes = () => {
  app.post('/api/internal/initial-context-build', build_initial_context);
};
