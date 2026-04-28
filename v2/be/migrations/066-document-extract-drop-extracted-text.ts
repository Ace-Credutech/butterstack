import { QueryInterface, QueryTypes } from 'sequelize';

// Removes any reference to the `extracted_text` field from the document.extract prompt
// (system_text + user_template + response_schema). The text/binary parse paths now save
// parsed_text directly from the file buffer, so asking the AI to verbatim repeat the
// document is wasted output tokens and wall-clock time.

const strip_extracted_text_lines = (text: string | null): string | null => {
  if (!text) return text;
  const lines = text.split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('"extracted_text"'))      continue;
    if (/^extracted_text\s*:/i.test(trimmed))      continue;
    if (/extracted_text/i.test(trimmed) && /(must|should|return|provide|include|field)/i.test(trimmed)) continue;
    kept.push(line);
  }
  return kept.join('\n');
};

const drop_key_from_schema = (schema: any): any => {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(drop_key_from_schema);
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'extracted_text') continue;
    next[key] = drop_key_from_schema(value);
  }
  if (Array.isArray(schema.required)) {
    next['required'] = schema.required.filter((r: string) => r !== 'extracted_text');
  }
  return next;
};

export const up = async (qi: QueryInterface) => {
  const rows = await qi.sequelize.query<{
    id: string; system_text: string; user_template: string; response_schema: any;
  }>(`
    SELECT pv.id, pv.system_text, pv.user_template, pv.response_schema
    FROM prompt_versions pv
    JOIN prompts p ON p.id = pv.prompt_id
    WHERE p.slug = 'document.extract'
  `, { type: QueryTypes.SELECT });

  for (const row of rows) {
    const next_system   = strip_extracted_text_lines(row.system_text);
    const next_template = strip_extracted_text_lines(row.user_template);
    const next_schema   = drop_key_from_schema(row.response_schema);

    await qi.sequelize.query(`
      UPDATE prompt_versions
      SET system_text     = :system_text,
          user_template   = :user_template,
          response_schema = :response_schema
      WHERE id = :id
    `, {
      replacements: {
        id:              row.id,
        system_text:     next_system,
        user_template:   next_template,
        response_schema: next_schema ? JSON.stringify(next_schema) : null,
      },
    });
  }
};

export const down = async (_qi: QueryInterface) => {
  // No-op — original prompt content is user-authored via the admin UI; restoring is manual.
};
