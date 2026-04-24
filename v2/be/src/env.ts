import { z } from 'zod';

const csv = z.string().transform(s => s.split(',').map(v => v.trim()).filter(Boolean));

const env_schema = z.object({
  PORT:                      z.coerce.number().default(3000),
  NODE_ENV:                  z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL_PRIMARY:      z.string().default('postgres://localhost:5432/butterstack-2'),
  DATABASE_URL_ANALYTICS:    z.string().optional(),
  DATABASE_URL_AUDIT:        z.string().optional(),

  SLOW_QUERY_MS:             z.coerce.number().default(500),

  REDIS_URL:                 z.string().default('redis://localhost:6379'),

  AI_PROVIDER:               z.enum(['anthropic', 'openai', 'openrouter', 'minmax', 'claude-max']).default('anthropic'),
  ANTHROPIC_API_KEY:         z.string().optional(),
  OPENAI_API_KEY:            z.string().optional(),
  OPENROUTER_API_KEY:        z.string().optional(),
  MODEL_DEFAULT:             z.string().default('claude-opus-4-7'),
  CONTEXT_BUDGET_TOKENS:     z.coerce.number().default(12000),

  // Storage — MinIO (S3-compatible)
  MINIO_ENDPOINT:            z.string().optional(),
  MINIO_ACCESS_KEY:          z.string().optional(),
  MINIO_SECRET_KEY:          z.string().optional(),
  MINIO_BUCKET_NAME:         z.string().optional(),
  MINIO_REGION:              z.string().default('us-east-1'),
  MINIO_USE_SSL:             z.coerce.boolean().default(false),

  // Keycloak OIDC
  KEYCLOAK_URL:              z.string().optional(),
  KEYCLOAK_REALM:            z.string().optional(),
  KEYCLOAK_AUDIENCE:         z.string().optional(),
  KEYCLOAK_CLIENT_ID:        z.string().optional(),
  KEYCLOAK_CLIENT_SECRET:    z.string().optional(),
  KEYCLOAK_ADMIN_REALM:         z.string().optional(),
  KEYCLOAK_ADMIN_CLIENT_ID:     z.string().optional(),
  KEYCLOAK_ADMIN_CLIENT_SECRET: z.string().optional(),
  SESSION_SECRET:            z.string().default('change-me'),
  SESSION_COOKIE_NAME:       z.string().default('butterstack_sid'),

  // File upload limits (KB) + allowed MIME types (comma-separated → string[])
  MAX_IMAGE_SIZE_KB:         z.coerce.number().int().positive().default(200),
  MAX_DOCUMENT_SIZE_KB:      z.coerce.number().int().positive().default(2048),
  MAX_FILE_SIZE_KB:          z.coerce.number().int().positive().default(5120),
  ALLOWED_IMAGE_TYPES:       csv.default('image/jpeg,image/png,image/webp,image/gif'),
  ALLOWED_DOCUMENT_TYPES:    csv.default('application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
});

export const env = env_schema.parse(process.env);
export type Env = typeof env;

export const keycloak_issuer = (): string | null => {
  if (!env.KEYCLOAK_URL || !env.KEYCLOAK_REALM) return null;
  return `${env.KEYCLOAK_URL.replace(/\/$/, '')}/realms/${env.KEYCLOAK_REALM}`;
};
