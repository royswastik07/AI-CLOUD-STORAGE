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

// --- NEW: Add the ALTER TABLE command ---
const alterTableQuery = `
  ALTER TABLE files ADD COLUMN IF NOT EXISTS ai_tags TEXT[];
`;

(async () => {
  try {
    await db.query(createTableQuery);
    await db.query(alterTableQuery); // Run the new command
    console.log("✅ Database tables configured successfully.");
  } catch (err) {
    console.error("❌ Error configuring database:", err);
  }
})();