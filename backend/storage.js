// backend/storage.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Google Cloud Storage
// Railway: Use GOOGLE_CREDENTIALS env var (JSON string)
// Local: Use keyFilename
const getGoogleCredentials = () => {
    if (process.env.GOOGLE_CREDENTIALS) {
        return { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS) };
    }
    return { keyFilename: path.join(__dirname, 'ai-cloud-storage-b12345.json') };
};

const storage = new Storage(getGoogleCredentials());

// Bucket name from env or default
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-cloud-storage-files';
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Upload a file to Google Cloud Storage
 */
async function uploadToGCS(filePath, destFileName) {
    await bucket.upload(filePath, {
        destination: destFileName,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });

    // Generate a signed URL (7 days)
    const file = bucket.file(destFileName);
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destFileName}`;
    return { publicUrl, signedUrl };
}

/**
 * Delete a file from Google Cloud Storage
 */
async function deleteFromGCS(fileName) {
    try {
        await bucket.file(fileName).delete();
        console.log(`✅ Deleted ${fileName} from GCS`);
    } catch (err) {
        console.error(`❌ Error deleting ${fileName} from GCS:`, err.message);
    }
}

/**
 * Generate a signed URL for accessing a file
 */
async function getSignedUrl(fileName, expiresInMs = 3600000) {
    const [signedUrl] = await bucket.file(fileName).getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInMs,
    });
    return signedUrl;
}

module.exports = {
    uploadToGCS,
    deleteFromGCS,
    getSignedUrl,
    BUCKET_NAME
};
