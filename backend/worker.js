// backend/worker.js
const { Worker } = require('bullmq');
const path = require('path');
const vision = require('@google-cloud/vision');
const { Storage } = require('@google-cloud/storage');
const db = require('./db');
const fs = require('fs');
const os = require('os');

// Initialize Google Cloud clients
const client = new vision.ImageAnnotatorClient({
  keyFilename: './ai-cloud-storage-b12345.json'
});

const storage = new Storage({
  keyFilename: './ai-cloud-storage-b12345.json'
});

const BUCKET_NAME = 'ai-cloud-storage-files';

console.log('🤖 AI Worker started. Waiting for jobs...');

const worker = new Worker('file-analysis', async (job) => {
  const { filePath, fileId } = job.data;
  console.log(`Processing file ID: ${fileId} at path: ${filePath}`);

  try {
    let imagePath = filePath;
    let tempFilePath = null;

    // Check if it's a GCS path (gs://bucket/file)
    if (filePath.startsWith('gs://')) {
      // Download from GCS to temp file for Vision API
      const fileName = filePath.split('/').pop();
      tempFilePath = path.join(os.tmpdir(), fileName);

      await storage.bucket(BUCKET_NAME).file(fileName).download({
        destination: tempFilePath
      });
      console.log(`📥 Downloaded ${fileName} from GCS for analysis`);
      imagePath = tempFilePath;
    }

    // Use the Google Vision API to detect labels in the image
    const [result] = await client.labelDetection(imagePath);
    const labels = result.labelAnnotations;
    const ai_tags = labels.map(label => label.description);

    console.log(`🏷️  Tags for file ID ${fileId}:`, ai_tags);

    // Update the database with the generated tags
    const updateQuery = `
      UPDATE files SET ai_tags = $1 WHERE id = $2;
    `;
    await db.query(updateQuery, [ai_tags, fileId]);

    console.log(`✅ Successfully updated DB for file ID: ${fileId}`);

    // Clean up temp file if we downloaded from GCS
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  } catch (err) {
    console.error(`❌ Failed to process file ID ${fileId}:`, err);
  }
}, {
  connection: {
    host: 'localhost',
    port: 6379
  }
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});