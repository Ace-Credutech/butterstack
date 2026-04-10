// Self-improving dictionary — lives in memory, persists to DB, grows with every AI response.
// Word mappings are weighted by frequency. More AI confirmations = higher confidence = used sooner.

import { query } from '../db.ts'

type DictEntry = {
  cleanWord:  string
  category:   string
  confidence: number
  frequency:  number
}

// In-memory store — fast O(1) lookup
const memory = new Map<string, DictEntry>()

let loaded    = false
let dirty     = new Map<string, DictEntry>()   // new/updated entries waiting to flush
let flushTimer: ReturnType<typeof setTimeout> | null = null

const FLUSH_MS          = 5_000    // flush dirty entries every 5s
const MIN_CONFIDENCE    = 0.4      // below this: skip entry during lookup
const CONFIDENCE_GROWTH = 0.05     // each AI confirmation nudges confidence up

// ── Load from DB on first use ─────────────────────────────────────────────────

export async function ensureLoaded(): Promise<void> {
  if (loaded) return
  const rows = await query(`SELECT raw_word, clean_word, category, confidence, frequency FROM local_dictionary`)
  for (const row of rows.rows) {
    memory.set(row.raw_word.toLowerCase(), {
      cleanWord:  row.clean_word,
      category:   row.category,
      confidence: parseFloat(row.confidence),
      frequency:  row.frequency,
    })
  }
  loaded = true
}

// ── Lookup ────────────────────────────────────────────────────────────────────

export async function lookup(word: string): Promise<string | null> {
  await ensureLoaded()
  const entry = memory.get(word.toLowerCase())
  if (!entry || entry.confidence < MIN_CONFIDENCE) return null
  return entry.cleanWord
}

export async function translatePhrase(text: string): Promise<{ result: string; confidence: number }> {
  await ensureLoaded()
  const words       = text.split(/\s+/)
  let translated    = 0

  const result = words.map(word => {
    const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase()
    const entry = memory.get(clean)
    if (entry && entry.confidence >= MIN_CONFIDENCE) {
      translated++
      return entry.cleanWord
    }
    return word
  }).join(' ')

  const confidence = words.length > 0 ? translated / words.length : 0
  return { result, confidence }
}

// ── Learn from AI response ────────────────────────────────────────────────────
// Call after every AI streamline/token call. Extracts word-level learnings.

export async function learnFromStreamline(rawInput: string, cleanOutput: string): Promise<void> {
  await ensureLoaded()

  const rawWords   = rawInput.toLowerCase().split(/\s+/).filter(w => /^[a-z]/.test(w))
  const cleanWords = cleanOutput.toLowerCase().split(/\s+/).filter(w => /^[a-z]/.test(w))

  // Simple positional alignment — works well for short phrases
  const minLen = Math.min(rawWords.length, cleanWords.length)
  for (let i = 0; i < minLen; i++) {
    const raw   = rawWords[i].replace(/[^a-z]/g, '')
    const clean = cleanWords[i].replace(/[^a-z]/g, '')
    if (!raw || !clean || raw === clean) continue
    if (raw.length < 2 || clean.length < 2)   continue   // skip single chars

    upsertEntry(raw, clean, 'hinglish')
  }

  schedulFlush()
}

export async function learnFromTokens(cleanPrompt: string, tokens: Record<string, unknown>): Promise<void> {
  await ensureLoaded()

  const words = cleanPrompt.toLowerCase().split(/\s+/)

  // Learn: which words in a prompt correlate to which page_type / sections / actions
  if (typeof tokens.page_type === 'string') {
    for (const word of words) {
      const w = word.replace(/[^a-z]/g, '')
      if (w.length < 3) continue
      if (w === tokens.page_type) continue
      upsertEntry(w, tokens.page_type as string, 'ui_keyword')
    }
  }

  if (Array.isArray(tokens.sections)) {
    for (const section of tokens.sections as string[]) {
      upsertEntry(section.toLowerCase().replace(/\s+/g, '_'), section, 'ui_keyword')
    }
  }

  schedulFlush()
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function upsertEntry(rawWord: string, cleanWord: string, category: string): void {
  const key      = rawWord.toLowerCase()
  const existing = memory.get(key)

  if (existing && existing.cleanWord === cleanWord) {
    // Reinforce: bump frequency and grow confidence
    existing.frequency++
    existing.confidence = Math.min(1, existing.confidence + CONFIDENCE_GROWTH)
    memory.set(key, existing)
    dirty.set(key, existing)
  } else if (!existing) {
    // New entry
    const entry: DictEntry = { cleanWord, category, confidence: 0.5, frequency: 1 }
    memory.set(key, entry)
    dirty.set(key, entry)
  }
  // If existing but different cleanWord: skip — keep the established mapping
}

function schedulFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(flushToDB, FLUSH_MS)
}

async function flushToDB(): Promise<void> {
  flushTimer = null
  if (!dirty.size) return

  const entries = [...dirty.entries()]
  dirty = new Map()

  await Promise.all(entries.map(([rawWord, e]) =>
    query(
      `INSERT INTO local_dictionary (raw_word, clean_word, category, confidence, frequency)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (raw_word, category) DO UPDATE SET
         clean_word = EXCLUDED.clean_word,
         confidence = EXCLUDED.confidence,
         frequency  = EXCLUDED.frequency,
         updated_at = NOW()`,
      [rawWord, e.cleanWord, e.category, e.confidence, e.frequency]
    ).catch((err) => console.error('[dict flush]', err.message))
  ))
}

// ── Stats (for monitoring) ────────────────────────────────────────────────────

export function dictionaryStats() {
  const entries    = [...memory.values()]
  const highConf   = entries.filter(e => e.confidence >= 0.8).length
  const medConf    = entries.filter(e => e.confidence >= 0.5 && e.confidence < 0.8).length
  const lowConf    = entries.filter(e => e.confidence < 0.5).length
  return { total: memory.size, highConf, medConf, lowConf, dirty: dirty.size }
}
