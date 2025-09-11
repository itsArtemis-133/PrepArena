// server/config/s3.js
const AWS = require('aws-sdk');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'preparena-uploads';

// Upload file to S3
const uploadToS3 = async (file, filename) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private' // Private access, we'll serve via signed URLs
  };

  try {
    const result = await s3.upload(params).promise();
    return {
      success: true,
      key: filename,
      location: result.Location,
      bucket: BUCKET_NAME
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get signed URL for private file access
const getSignedUrl = (key, expiresIn = 3600) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn // URL expires in 1 hour by default
  };

  return s3.getSignedUrl('getObject', params);
};

// Check if S3 is configured
const isS3Configured = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID && 
           process.env.AWS_SECRET_ACCESS_KEY && 
           process.env.AWS_S3_BUCKET);
};

module.exports = {
  s3,
  uploadToS3,
  getSignedUrl,
  isS3Configured,
  BUCKET_NAME
};