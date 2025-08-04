// --- Imports ---
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- App Initialization ---
const app = express();
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
 * @desc    Uploads a single file.
 */
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }
  res.status(200).send({
    message: 'File uploaded successfully!',
    file: req.file,
  });
});

/**
 * @route   GET /files
 * @desc    Lists all files in the uploads directory.
 */
app.get('/files', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).send({ message: 'Unable to scan directory.', error: err });
    }
    res.status(200).send(files);
  });
});

/**
 * @route   GET /files/:filename
 * @desc    Downloads a specific file.
 */
app.get('/files/:filename', (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(uploadsDir, fileName);

  res.download(filePath, fileName, (err) => {
    if (err) {
      // If headers haven't been sent, it means the file was not found before starting the download.
      if (!res.headersSent) {
        res.status(404).send({ message: 'File not found.' });
      }
    }
  });
});

/**
 * @route   DELETE /files/:filename
 * @desc    Deletes a specific file.
 */
app.delete('/files/:filename', (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(uploadsDir, fileName);

  fs.unlink(filePath, (err) => {
    if (err) {
      // This error can mean file not found or permission issues
      return res.status(404).send({ message: 'File not found or unable to delete.' });
    }
    res.status(200).send({ message: `File '${fileName}' deleted successfully.` });
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});