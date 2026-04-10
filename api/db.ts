import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.POSTGRES_DB_STRING,
})

export async function query(sql: string, params?: unknown[]) {
  const client = await pool.connect()
  try {
    return await client.query(sql, params)
  } finally {
    client.release()
  }
}
