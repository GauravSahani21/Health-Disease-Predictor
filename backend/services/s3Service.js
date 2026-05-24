const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Upload file to Local Storage (replaces S3)
 * @param {Object} file - Multer file object
 * @param {String} prefix - Folder prefix (used as subdirectory)
 * @returns {Promise<String>} - Public URL of uploaded file
 */
async function uploadToS3(file, prefix = 'uploads') {
  try {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    // Create subdirectory if needed
    const targetDir = path.join(UPLOADS_DIR, prefix);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, fileName);

    // Write file to disk
    await fs.promises.writeFile(filePath, file.buffer);
    
    console.log(`[Local Storage] Saved file: ${filePath}`);
    
    // Return URL (served via express.static)
    // URL format: http://localhost:5000/uploads/prefix/filename
    return `${BASE_URL}/uploads/${prefix}/${fileName}`;
  } catch (error) {
    console.error('[Local Storage] Upload error:', error);
    throw new Error('Failed to save file locally');
  }
}

/**
 * Get URL (Mock signed URL behavior)
 */
function getSignedUrl(key, expiresIn = 3600) {
  // Local storage is public, so just return the URL
  // Key usually comes as "prefix/filename"
  return `${BASE_URL}/uploads/${key}`;
}

/**
 * Delete file from Local Storage
 */
async function deleteFromS3(key) {
  try {
    const filePath = path.join(UPLOADS_DIR, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log(`[Local Storage] Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error('[Local Storage] Delete error:', error);
    // Don't throw, just log
  }
}

/**
 * Upload buffer to Local Storage
 */
async function uploadBufferToS3(buffer, fileName, contentType = 'image/png') {
  try {
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    await fs.promises.writeFile(filePath, buffer);
    console.log(`[Local Storage] Saved buffer: ${filePath}`);
    
    return `${BASE_URL}/uploads/${fileName}`;
  } catch (error) {
    console.error('[Local Storage] Buffer upload error:', error);
    throw new Error('Failed to save buffer locally');
  }
}

module.exports = {
  uploadToS3,
  getSignedUrl,
  deleteFromS3,
  uploadBufferToS3,
};
