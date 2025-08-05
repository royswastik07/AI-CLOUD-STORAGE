// --- Imports ---
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const cors = require('cors');

// --- App Initialization ---
const app = express();
app.use(cors());
const PORT = 3001;

// --- Server Configuration ---
// Get the absolute path for the 'uploads' directory
const uploadsDir = path.join(__dirname, 'uploads');

// Ensure the 'uploads' directory exists, if not, create it.
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up the storage engine for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // The folder where files will be saved
  },
  filename: function (req, file, cb) {
    // Use the original filename + a timestamp to prevent file name conflicts
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

// --- API ENDPOINTS ---

/**
 * @route   GET /
 * @desc    Test route to check if the server is running.
 */
app.get('/', (req, res) => {
  res.send('Hello from the AI Cloud Storage Backend!');
});

/**
 * @route   POST /upload
 * @desc    Uploads a single file and creates a metadata record in the database.
 */
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  // Data from the uploaded file provided by multer
  const { filename, originalname, path: filePath, mimetype, size } = req.file;

  try {
    // The SQL query to insert file metadata into our 'files' table
    const insertQuery = `
      INSERT INTO files(file_name, original_name, file_path, mime_type, file_size)
      VALUES($1, $2, $3, $4, $5)
      RETURNING *; 
    `;
    // RETURNING * will return the row that was just inserted, including its new ID and upload_date

    // The values to be inserted, corresponding to $1, $2, etc.
    const values = [filename, originalname, filePath, mimetype, size];

    // Execute the query using our db module
    const result = await db.query(insertQuery, values);
    
    // Send back the newly created database record as confirmation
    res.status(201).send({
      message: 'File uploaded and metadata saved successfully!',
      fileRecord: result.rows[0],
    });

  } catch (err) {
    console.error('Database insertion error:', err);
    res.status(500).send({ message: 'Error saving file metadata to database.' });
  }
});

/**
 * @route   GET /files
 * @desc    Lists all file metadata records from the database.
 */
app.get('/files', async (req, res) => {
  try {
    const selectQuery = 'SELECT id, file_name, original_name, mime_type, file_size, upload_date FROM files ORDER BY upload_date DESC;';
    const result = await db.query(selectQuery);
    res.status(200).send(result.rows);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).send({ message: 'Error retrieving files from database.' });
  }
});

/**
 * @route   GET /files/:filename
 * @desc    Downloads a specific file by looking up its path in the database.
 */
app.get('/files/:filename', async (req, res) => {
  const { filename } = req.params;

  try {
    const findQuery = 'SELECT * FROM files WHERE file_name = $1';
    const result = await db.query(findQuery, [filename]);

    if (result.rows.length === 0) {
      return res.status(404).send({ message: 'File not found in database.' });
    }

    const fileRecord = result.rows[0];
    res.download(fileRecord.file_path, fileRecord.original_name, (err) => {
      if (err && !res.headersSent) {
        console.error("Error during file download:", err);
      }
    });

  } catch (err) {
    console.error('Database error during download:', err);
    res.status(500).send({ message: 'Error while downloading file.' });
  }
});

/**
 * @route   DELETE /files/:filename
 * @desc    Deletes a specific file's physical copy and its database record.
 */
app.delete('/files/:filename', async (req, res) => {
  const { filename } = req.params;
  
  try {
    // First, find the file record in the database
    const findQuery = 'SELECT * FROM files WHERE file_name = $1';
    const findResult = await db.query(findQuery, [filename]);

    if (findResult.rows.length === 0) {
      return res.status(404).send({ message: 'File not found in database.' });
    }

    const fileRecord = findResult.rows[0];
    const filePath = fileRecord.file_path;

    // Second, delete the record from the database
    const deleteQuery = 'DELETE FROM files WHERE id = $1';
    await db.query(deleteQuery, [fileRecord.id]);

    // Third, delete the physical file from the server
    fs.unlink(filePath, (err) => {
      if (err) {
        // This error is serious, as the DB record is gone but the file remains.
        console.error("Error deleting physical file, but DB record was deleted:", err);
        return res.status(500).send({ message: "Error deleting the physical file. Please check server logs."});
      }

      res.status(200).send({ message: `File '${filename}' and its record were deleted successfully.` });
    });

  } catch (err) {
    console.error('Database error during delete:', err);
    res.status(500).send({ message: 'Error while deleting file.' });
  }
});

// A quick self-invoking function to test the database connection on startup
// (async () => {
//   try {
//     const result = await db.query('SELECT NOW()'); // A simple query to get the current time from the DB
//     console.log('✅ Database connection successful. Fetched time from DB:', result.rows[0].now);
//   } catch (err) {
//     console.error('❌ Database connection failed:', err);
//   }
// })();

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});