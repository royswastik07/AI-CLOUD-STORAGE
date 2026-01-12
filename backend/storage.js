// backend/storage.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Google Cloud Storage with service account credentials
const storage = new Storage({
    keyFilename: path.join(__dirname, 'ai-cloud-storage-b12345.json')
});

// Your bucket name
const BUCKET_NAME = 'ai-cloud-storage-files';
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Upload a file to Google Cloud Storage
 * @param {string} filePath - Local path to the file
 * @param {string} destFileName - Destination filename in GCS
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
async function uploadToGCS(filePath, destFileName) {
    await bucket.upload(filePath, {
        destination: destFileName,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });

    // Generate a signed URL that expires in 7 days (for private buckets)
    const file = bucket.file(destFileName);
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return the public URL format
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destFileName}`;

    return { publicUrl, signedUrl };
}

/**
 * Delete a file from Google Cloud Storage
 * @param {string} fileName - Name of the file in GCS
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
 * @param {string} fileName - Name of the file in GCS
 * @param {number} expiresInMs - Expiration time in milliseconds
 * @returns {Promise<string>} - Signed URL
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
