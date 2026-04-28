# Document Upload & Parsing Process

## Overview

Documents are uploaded by users, stored in MinIO, and parsed asynchronously via a job queue. The AI receives only clean extracted text — never raw binary.

---

## Upload Flow

```
User selects file (UI)
  → POST /api/documents/upload  (form: file, entity_type, entity_id, purpose)
  → Store binary in MinIO
      key: documents/{entity_type}/{entity_id}/{uuid}/{safe_filename}
  → Create Document record  (parse_status = 'pending')
  → Create DocumentLink record  (links doc to entity: org | user | conversation)
  → Commit DB transaction
  → Queue job: documents / document.parse  (delay 500ms, job_id = parse-{doc_id})
  → Return DocumentItem to UI immediately
  → UI shows document row with "Parsing…" spinner
```

---

## Parse Flow

The parse worker picks up the queued job (concurrency: 4) and calls the internal endpoint.

```
Worker: document.parse job
  → POST /api/internal/document-parse
      { document_id, entity_type, entity_id, uploaded_by }

  → Fetch Document from DB
  → Guard: if parse_status !== 'pending', skip (idempotent)
  → Fetch binary from MinIO

  → Route by MIME type:
      ┌─ text/*, JSON, XML, CSV, Markdown
      │     → read buffer as UTF-8
      │     → extract_via_text_ai()
      │
      ├─ application/pdf
      │     → pdf-parse  →  extract plain text
      │     → extract_via_text_ai()
      │
      ├─ DOCX  (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
      │     → mammoth.extractRawText()  →  extract plain text
      │     → extract_via_text_ai()
      │
      ├─ XLSX  (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
      │     → xlsx.read() → sheet_to_csv per sheet  →  extract plain text
      │     → extract_via_text_ai()
      │
      └─ image/*  (PNG, JPEG, WEBP, …)  OR unknown
            → extract_via_vision_ai()   (multimodal, attaches image buffer)

  → Guard: reload doc — if status changed (cancel/delete during AI call), skip save
  → Save results in transaction:
      - DocumentPassage rows  (idx, type, heading, text, keywords)
      - DocumentPassageLink rows  (passage-to-passage relationships)
      - DocumentEntity rows  (people, teams, tech, features, products, companies)
      - Document.update  (parse_status='parsed', ai_name, ai_summary, keywords, parsed_text)
  → Broadcast WebSocket event: document.parsed
      → to user, to org (if entity_type=org), to project (if entity_type=project)
```

---

## Text Extraction Libraries

| Format | MIME | Library | How |
|--------|------|---------|-----|
| PDF    | `application/pdf` | `pdf-parse` | Extracts text layer from PDF pages |
| DOCX   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `mammoth` | `extractRawText({ buffer })` |
| XLSX   | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `xlsx` (SheetJS) | Each sheet → CSV, joined with `\n\n` |
| Plain text, JSON, CSV, Markdown, XML | `text/*`, `*json`, `*csv`, etc. | — | `buffer.toString('utf-8')` |
| Images | `image/*` | Vision AI (gpt-4.1) | Buffer attached as image in multimodal call |

Extracted text is sliced to **30,000 characters** before being sent to the AI to stay within token limits.

---

## AI Extraction (document.extract prompt)

The prompt instructs the AI to return a structured JSON object:

```json
{
  "ai_name":        "Human-readable document title",
  "ai_summary":     "1–3 sentence summary",
  "extracted_text": "Full reconstructed text",
  "passages": [
    {
      "idx": 0,
      "type": "requirement | objective | decision | risk | data | ...",
      "heading": "Optional section heading",
      "text": "Passage content",
      "keywords": ["word1", "word2"],
      "links": [{ "to_idx": 2, "link_type": "references | continues | ..." }]
    }
  ],
  "entities": [
    { "name": "Entity name", "type": "person | team | technology | feature | product | company | other" }
  ],
  "keywords": ["global", "document", "keywords"]
}
```

Model and max_tokens are stored in the `prompt_versions` table (slug: `document.extract`). Default model is `gpt-4.1`, default max_tokens is 4000.

---

## Cancellation

- Cancel before AI call starts: job is removed from the queue via `cancel_job()`.
- Cancel during AI call: the guard after the AI call (`doc.reload()` + status check) detects the status change and skips saving results.
- UI shows Cancel button while `parse_status === 'pending'`.

---

## Error Handling

| Stage | Behaviour |
|-------|-----------|
| Upload fails (MinIO) | DB transaction rolled back, MinIO object deleted |
| Text extraction fails (mammoth/pdf-parse/xlsx) | Error propagates, `parse_status → 'failed'`, `parse_error` set |
| AI call fails | `parse_status → 'failed'`, `parse_error` set, `run.completed` WS event with status `'error'` |
| Save transaction fails | Rolled back, `parse_status → 'failed'` |
| Broadcast fails | Swallowed (best-effort) — parse result is already saved |

---

## Search & Pagination

Both list endpoints (`GET /api/documents` and `GET /api/documents/all`) support:

| Param | Default | Notes |
|-------|---------|-------|
| `page` | 1 | 1-based |
| `page_size` | 20 | Max 100 |
| `search` | — | ILIKE match on `filename` OR `ai_name` |

The UI debounces search input by 400ms and resets to page 1 on each new search.

---

## WebSocket Events

| Event | Payload | When |
|-------|---------|------|
| `document.parsed` | `{ document_id, parse_status, ai_name, ai_summary, parse_error, passage_count, keyword_count }` | Parse completes (success, fail, or cancel) |
| `run.started` | `{ run_id, scope_id, model, prompt_slug, status, input_payload }` | Vision AI call begins |
| `run.completed` | `{ run_id, scope_id, model, status, tokens_in, tokens_out, latency_ms, output_text, error_message }` | Vision AI call finishes |

`run.started` / `run.completed` events are only emitted for vision AI calls (not text-path calls, which go through `run_prompt` which handles its own logging).

---

## Key Files

| File | Role |
|------|------|
| `v2/be/src/apis/documents/documents.routes.ts` | Upload, list, delete, cancel, reparse, presigned URL |
| `v2/be/src/apis/documents/document-parse.routes.ts` | Internal parse endpoint — text extraction + AI call + save |
| `v2/be/src/workers/document-parse/document-parse.worker.ts` | BullMQ worker that calls the internal parse endpoint |
| `v2/fe/src/app/services/documents.service.ts` | HTTP client for document API |
| `v2/fe/src/app/components/organisms/documents-panel/` | Document list UI with search, pagination, slide-over detail |
