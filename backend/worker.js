// backend/worker.js
const { Worker } = require('bullmq');
const path = require('path');
const vision = require('@google-cloud/vision');
const { Storage } = require('@google-cloud/storage');
const db = require('./db');
const fs = require('fs');
const os = require('os');

// Parse Redis URL from environment or use localhost
const getRedisConnection = () => {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
    };
  }
  return { host: 'localhost', port: 6379 };
};

// Initialize Google Cloud clients
// Railway: Use GOOGLE_CREDENTIALS env var (JSON string)
// Local: Use keyFilename
const getGoogleCredentials = () => {
  if (process.env.GOOGLE_CREDENTIALS) {
    return { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS) };
  }
  return { keyFilename: './ai-cloud-storage-b12345.json' };
};

const client = new vision.ImageAnnotatorClient(getGoogleCredentials());
const storage = new Storage(getGoogleCredentials());

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-cloud-storage-files';

console.log('🤖 AI Worker started. Waiting for jobs...');

const worker = new Worker('file-analysis', async (job) => {
  const { filePath, fileId } = job.data;
  console.log(`Processing file ID: ${fileId} at path: ${filePath}`);

  try {
    let imagePath = filePath;
    let tempFilePath = null;

    // Check if it's a GCS path (gs://bucket/file)
    if (filePath.startsWith('gs://')) {
      const fileName = filePath.split('/').pop();
      tempFilePath = path.join(os.tmpdir(), fileName);

      await storage.bucket(BUCKET_NAME).file(fileName).download({
        destination: tempFilePath
      });
      console.log(`📥 Downloaded ${fileName} from GCS for analysis`);
      imagePath = tempFilePath;
    }

    // Use the Google Vision API to detect labels
    const [result] = await client.labelDetection(imagePath);
    const labels = result.labelAnnotations;
    const ai_tags = labels.map(label => label.description);

    console.log(`🏷️  Tags for file ID ${fileId}:`, ai_tags);

    // Update the database
    const updateQuery = `UPDATE files SET ai_tags = $1 WHERE id = $2;`;
    await db.query(updateQuery, [ai_tags, fileId]);

    console.log(`✅ Successfully updated DB for file ID: ${fileId}`);

    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  } catch (err) {
    console.error(`❌ Failed to process file ID ${fileId}:`, err);
  }
}, {
  connection: getRedisConnection()
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});