// Fuzzy cache lookup using pg_trgm similarity.
// Finds semantically close cached prompts so near-duplicate inputs skip OpenAI.

import { query } from '../db.ts'
import type { UITokens } from './openai.ts'

const SIMILARITY_THRESHOLD = 0.88   // high threshold — only near-identical prompts should hit cache

export type FuzzyMatch = {
  tokens:      UITokens
  matchedPrompt: string
  similarity:  number
}

export async function fuzzyLookup(cleanPrompt: string): Promise<FuzzyMatch | null> {
  const result = await query(
    `SELECT tokens, clean_prompt, similarity(clean_prompt, $1) AS sim
     FROM token_cache
     WHERE invalidated = FALSE
       AND similarity(clean_prompt, $1) > $2
     ORDER BY sim DESC
     LIMIT 1`,
    [cleanPrompt, SIMILARITY_THRESHOLD]
  )

  if (!result.rows.length) return null

  const row = result.rows[0]

  // Increment hit count on fuzzy-matched entry
  await query(
    `UPDATE token_cache SET hit_count = hit_count + 1, last_hit_at = NOW() WHERE clean_prompt = $1`,
    [row.clean_prompt]
  )

  return {
    tokens:        row.tokens as UITokens,
    matchedPrompt: row.clean_prompt,
    similarity:    parseFloat(row.sim),
  }
}
