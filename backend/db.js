const { Pool } = require('pg');

// Create a new pool of connections. A "pool" is more efficient than a single
// client for web applications as it manages multiple connections simultaneously.
// The connection details here must match what we set in our docker-compose.yml file.
const pool = new Pool({
  user: 'myuser',
  host: 'localhost', // The server is running on our machine, and Docker maps the port.
  database: 'aistorage',
  password: 'mypassword',
  port: 5432,
});

// We are exporting a single object with a 'query' method.
// This allows us to import this module anywhere in our app and run queries
// without having to worry about managing connections.
module.exports = {
  query: (text, params) => pool.query(text, params),
};