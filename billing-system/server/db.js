import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/uuon'
});

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    console.log(`Query executed in ${Date.now() - start}ms`);
    return res;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function getClient() {
  return await pool.connect();
}

export default pool;
