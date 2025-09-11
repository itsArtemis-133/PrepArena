// server/config/s3.js
const { S3Client } = require("@aws-sdk/client-s3");
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

class S3Service {
  constructor() {
    // Check if S3 is configured
    this.isConfigured = !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME &&
      process.env.AWS_REGION
    );

    if (this.isConfigured) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.bucketName = process.env.AWS_S3_BUCKET_NAME;
      console.log("✅ AWS S3 configured successfully");
    } else {
      console.warn("⚠️  AWS S3 not configured - falling back to local storage");
    }
  }

  /**
   * Generate a unique filename with timestamp
   */
  generateFileName(originalName) {
    const timestamp = Date.now();
    const safeName = (originalName || "file")
      .toString()
      .replace(/[^\w.\-]+/g, "_")
      .slice(0, 180);
    return `uploads/${timestamp}__${safeName}`;
  }

  /**
   * Upload file to S3
   * @param {Buffer} buffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File mime type
   * @returns {Promise<{url: string, key: string}>}
   */
  async uploadFile(buffer, originalName, mimeType = "application/pdf") {
    if (!this.isConfigured) {
      throw new Error("S3 not configured");
    }

    const key = this.generateFileName(originalName);
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Make files publicly readable if needed, or use signed URLs
      // ACL: 'public-read', // Uncomment if you want public access
    });

    try {
      await this.s3Client.send(command);
      
      // Return the S3 object URL (you can also return signed URL if needed)
      const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      
      return {
        url,
        key,
        bucket: this.bucketName,
      };
    } catch (error) {
      console.error("S3 upload error:", error);
      throw new Error("Failed to upload file to S3");
    }
  }

  /**
   * Get a signed URL for secure file access
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.isConfigured) {
      throw new Error("S3 not configured");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error("S3 signed URL error:", error);
      throw new Error("Failed to generate signed URL");
    }
  }

  /**
   * Delete file from S3
   * @param {string} key - S3 object key
   */
  async deleteFile(key) {
    if (!this.isConfigured) {
      throw new Error("S3 not configured");
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      console.log(`File deleted from S3: ${key}`);
    } catch (error) {
      console.error("S3 delete error:", error);
      throw new Error("Failed to delete file from S3");
    }
  }

  /**
   * Extract S3 key from URL
   * @param {string} url - S3 URL or key
   * @returns {string} S3 key
   */
  extractKeyFromUrl(url) {
    if (!url) return null;
    
    // If it's already a key (doesn't start with http), return as is
    if (!url.startsWith("http")) {
      return url.startsWith("uploads/") ? url : `uploads/${url}`;
    }
    
    // Extract key from S3 URL
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    } catch {
      return null;
    }
  }
}

module.exports = new S3Service();