// --- Imports ---
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const cors = require('cors');
const fileQueue = require('./queue');
const { uploadToGCS, deleteFromGCS, getSignedUrl, BUCKET_NAME } = require('./storage');

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
 * @desc    Uploads a file to GCS, saves metadata, and queues a job for AI analysis.
 */
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  const { filename, originalname, path: localFilePath, mimetype, size } = req.file;

  try {
    // Upload to Google Cloud Storage
    const { publicUrl, signedUrl } = await uploadToGCS(localFilePath, filename);
    console.log(`☁️  Uploaded to GCS: ${filename}`);

    // Save to database with GCS URL
    const insertQuery = `
      INSERT INTO files(file_name, original_name, file_path, mime_type, file_size, public_url)
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING *; 
    `;
    const gcsPath = `gs://${BUCKET_NAME}/${filename}`;
    const values = [filename, originalname, gcsPath, mimetype, size, publicUrl];
    const result = await db.query(insertQuery, values);
    const newFileRecord = result.rows[0];

    // Delete local file after successful GCS upload
    fs.unlink(localFilePath, (err) => {
      if (err) console.error('Warning: Could not delete local temp file:', err);
    });

    // Queue AI analysis for images
    if (mimetype.startsWith('image/')) {
      await fileQueue.add('analyze-image', {
        filePath: gcsPath,  // GCS path for the worker
        fileId: newFileRecord.id
      });
      console.log(`✅ Job added to queue for file ID: ${newFileRecord.id}`);
    }

    res.status(201).send({
      message: 'File uploaded to cloud successfully!',
      fileRecord: newFileRecord,
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send({ message: 'Error uploading file to cloud storage.' });
  }
});


/**
 * @route   GET /files
 * @desc    Lists all file metadata records, including AI tags and cloud URLs.
 */
app.get('/files', async (req, res) => {
  try {
    const selectQuery = 'SELECT id, file_name, original_name, mime_type, file_size, upload_date, ai_tags, public_url FROM files ORDER BY upload_date DESC;';
    const result = await db.query(selectQuery);

    // Generate fresh signed URLs for private bucket access
    const filesWithUrls = await Promise.all(result.rows.map(async (file) => {
      try {
        const signedUrl = await getSignedUrl(file.file_name, 3600000); // 1 hour
        return { ...file, signed_url: signedUrl };
      } catch (err) {
        console.error(`Error generating signed URL for ${file.file_name}:`, err.message);
        return { ...file, signed_url: file.public_url };
      }
    }));

    res.status(200).send(filesWithUrls);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).send({ message: 'Error retrieving files from database.' });
  }
});

/**
 * @route   GET /files/:filename
 * @desc    Redirects to cloud storage URL for download.
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

    // Generate a signed URL for download
    const signedUrl = await getSignedUrl(filename, 3600000); // 1 hour expiry
    res.redirect(signedUrl);
  } catch (err) {
    console.error('Error during download:', err);
    res.status(500).send({ message: 'Error while downloading file.' });
  }
});

/**
 * @route   DELETE /files/:filename
 * @desc    Deletes a file from GCS and its database record.
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

    // Delete from GCS
    await deleteFromGCS(filename);

    // Delete from database
    const deleteQuery = 'DELETE FROM files WHERE id = $1';
    await db.query(deleteQuery, [fileRecord.id]);

    res.status(200).send({ message: `File '${filename}' deleted from cloud successfully.` });
  } catch (err) {
    console.error('Error during delete:', err);
    res.status(500).send({ message: 'Error while deleting file.' });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`☁️  Using Google Cloud Storage bucket: ${BUCKET_NAME}`);
});