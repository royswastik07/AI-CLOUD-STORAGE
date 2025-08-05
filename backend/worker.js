// backend/worker.js
const { Worker } = require('bullmq');
const path = require('path');
const vision = require('@google-cloud/vision');
const db = require('./db');

// --- IMPORTANT: PASTE YOUR GOOGLE API KEY HERE ---
process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({
  "type": "service_account",
  "private_key": "YOUR_PRIVATE_KEY", // You will get this from a JSON file, not just an API key. 
  // For simplicity with an API key, we will adjust the client initialization.
  // The API Key method is simpler to start.
});

// --- Simpler client initialization with just an API Key ---
const client = new vision.ImageAnnotatorClient({
    keyFilename: './ai-cloud-storage-b12345.json' // <-- Use your actual filename here
});


console.log('🤖 AI Worker started. Waiting for jobs...');

const worker = new Worker('file-analysis', async (job) => {
  const { filePath, fileId } = job.data;
  console.log(`Processing file ID: ${fileId} at path: ${filePath}`);

  try {
    // Use the Google Vision API to detect labels in the image
    const [result] = await client.labelDetection(filePath);
    const labels = result.labelAnnotations;
    const ai_tags = labels.map(label => label.description);

    console.log(`🏷️  Tags for file ID ${fileId}:`, ai_tags);

    // Update the database with the generated tags
    const updateQuery = `
      UPDATE files SET ai_tags = $1 WHERE id = $2;
    `;
    await db.query(updateQuery, [ai_tags, fileId]);

    console.log(`✅ Successfully updated DB for file ID: ${fileId}`);
  } catch (err) {
    console.error(`❌ Failed to process file ID ${fileId}:`, err);
    // You could add more robust error handling here, like moving the job to a 'failed' queue
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