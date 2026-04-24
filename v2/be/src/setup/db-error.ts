import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';

type PgErrorLike = { code?: string; detail?: string; table?: string; column?: string; constraint?: string; message?: string };

const dig_pg = (err: any): PgErrorLike | null => {
  if (!err || typeof err !== 'object') return null;
  if (err.parent)   return err.parent   as PgErrorLike;
  if (err.original) return err.original as PgErrorLike;
  return null;
};

const pg_code_to_http = (code?: string): number => {
  if (!code) return 500;
  if (code === '23505') return 409;
  if (code === '23503') return 422;
  if (code === '23502') return 422;
  if (code === '23514') return 422;
  if (code === '22P02') return 400;
  if (code.startsWith('22')) return 400;
  if (code.startsWith('23')) return 422;
  return 500;
};

export const unwrap_db_error = (err: any): Error_Interface | null => {
  const pg = dig_pg(err);
  if (!pg) return null;
  return {
    code:    pg_code_to_http(pg.code),
    message: pg.message ?? String(err.message ?? 'Database error'),
    details: { pg_code: pg.code, pg_detail: pg.detail, table: pg.table, column: pg.column, constraint: pg.constraint },
  };
};

export const safe_rollback = async (transaction: Transaction | null | undefined): Promise<void> => {
  if (!transaction) return;
  try { await transaction.rollback(); } catch { /* already finished or lost connection — swallow */ }
};
