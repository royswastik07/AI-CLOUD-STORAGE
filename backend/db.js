const { Pool } = require('pg');

// Use DATABASE_URL from Railway or fallback to local config
const pool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })
  : new Pool({
    user: 'myuser',
    host: 'localhost',
    database: 'aistorage',
    password: 'mypassword',
    port: 5432,
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
};