const db = require('./db');

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    upload_date TIMESTAMPTZ DEFAULT NOW()
  );
`;

// A self-invoking async function to run the query
(async () => {
  try {
    await db.query(createTableQuery);
    console.log("✅ Table 'files' created successfully or already exists.");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  }
  // The script will exit automatically after running.
})();