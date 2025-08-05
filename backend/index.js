// --- Imports ---
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const cors = require('cors');
const fileQueue = require('./queue'); // --- NEW: Import the job queue

// --- App Initialization ---
const app = express();
app.use(cors());
const PORT = 3001;

// --- Server Configuration ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage: storage });

// --- API ENDPOINTS ---

app.get('/', (req, res) => {
  res.send('Hello from the AI Cloud Storage Backend!');
});

/**
 * @route   POST /upload
 * @desc    Uploads a file, saves metadata, and queues a job for AI analysis.
 */
// --- MODIFIED: This entire block is updated ---
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  const { filename, originalname, path: filePath, mimetype, size } = req.file;

  try {
    const insertQuery = `
      INSERT INTO files(file_name, original_name, file_path, mime_type, file_size)
      VALUES($1, $2, $3, $4, $5)
      RETURNING *; 
    `;
    const values = [filename, originalname, filePath, mimetype, size];
    const result = await db.query(insertQuery, values);
    const newFileRecord = result.rows[0];

    // --- NEW: Add a job to the queue for image files ---
    if (mimetype.startsWith('image/')) {
      await fileQueue.add('analyze-image', {
        filePath: newFileRecord.file_path,
        fileId: newFileRecord.id
      });
      console.log(`✅ Job added to queue for file ID: ${newFileRecord.id}`);
    }

    res.status(201).send({
      message: 'File uploaded successfully! Analysis has been queued.',
      fileRecord: newFileRecord,
    });

  } catch (err) {
    console.error('Upload or queueing error:', err);
    res.status(500).send({ message: 'Error saving file metadata.' });
  }
});


/**
 * @route   GET /files
 * @desc    Lists all file metadata records, including AI tags.
 */
// --- MODIFIED: The SELECT query is updated ---
app.get('/files', async (req, res) => {
  try {
    const selectQuery = 'SELECT id, file_name, original_name, mime_type, file_size, upload_date, ai_tags FROM files ORDER BY upload_date DESC;';
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
    res.download(fileRecord.file_path, fileRecord.original_name);
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
    const findQuery = 'SELECT * FROM files WHERE file_name = $1';
    const findResult = await db.query(findQuery, [filename]);
    if (findResult.rows.length === 0) {
      return res.status(404).send({ message: 'File not found in database.' });
    }
    const fileRecord = findResult.rows[0];
    const filePath = fileRecord.file_path;
    const deleteQuery = 'DELETE FROM files WHERE id = $1';
    await db.query(deleteQuery, [fileRecord.id]);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting physical file, but DB record was deleted:", err);
        return res.status(500).send({ message: "Error deleting the physical file. Please check server logs." });
      }
      res.status(200).send({ message: `File '${filename}' and its record were deleted successfully.` });
    });
  } catch (err) {
    console.error('Database error during delete:', err);
    res.status(500).send({ message: 'Error while deleting file.' });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});