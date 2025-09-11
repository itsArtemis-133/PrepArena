# AWS S3 Migration Guide

This guide explains the changes made to migrate PrepArena from local/ephemeral file storage to AWS S3.

## Changes Made

### 1. File Storage Migration
- **Before**: Files stored in local `server/uploads/` directory (ephemeral on Railway)
- **After**: Files stored in AWS S3 with fallback to local storage

### 2. Server Changes
- Added AWS S3 SDK dependencies (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- Created `server/config/s3.js` service for S3 operations
- Updated `server/routes/upload.js` to support both S3 and local storage
- Updated `server/routes/test.js` to serve files via S3 signed URLs
- Enhanced `server/controllers/testController.js` to prevent duplicate submissions

### 3. Client Changes
- Enhanced `client/src/pages/TestRunner.jsx` with:
  - Answer state persistence using localStorage
  - Multiple submission prevention
  - Anti-cheating measures (tab switching detection)
  - Improved scrolling behavior
  - Page unload protection during tests
- Updated upload components to use new endpoints
- Fixed random scrolling issues

### 4. Security Improvements
- Files now served via signed URLs (1-hour expiry)
- Submissions tracked to prevent multiple attempts
- Added anti-cheating measures in test runner

## Configuration

### Environment Variables (Required for S3)
```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

### S3 Bucket Setup
1. Create an S3 bucket in your preferred region
2. Create an IAM user with the following permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name"
        }
    ]
}
```

### Bucket CORS Configuration (if serving files directly)
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

## Backward Compatibility

### File Storage
- If S3 is not configured, the system falls back to local storage
- Existing local files continue to work
- Database can store either S3 keys or local filenames

### API Endpoints
- Legacy `/api/upload/file` endpoint maintained for backward compatibility
- New `/api/upload` endpoint for optimal experience

## Migration Process

### For Existing Deployments
1. Set up AWS S3 bucket and IAM user
2. Add environment variables to your deployment
3. Deploy the updated code
4. New uploads will go to S3, existing files remain accessible locally

### File Migration (Optional)
To migrate existing local files to S3:
1. Use AWS CLI or SDK to upload files from `server/uploads/` to S3
2. Update database records to point to S3 keys instead of local filenames
3. This step is optional as the system supports both storage types

## Testing

### Local Development
```bash
# Server
cd server
npm install
npm start

# Client  
cd client
npm install --legacy-peer-deps
npm run dev
```

### Production Deployment
1. Ensure all environment variables are set
2. S3 bucket is properly configured
3. Deploy to your hosting platform

## Troubleshooting

### Files Not Visible to Other Users
- **Cause**: Files stored locally on one server instance
- **Solution**: Configure S3 properly with environment variables

### PDF Download Issues
- **Cause**: S3 not configured or signed URL generation failing
- **Solution**: Check AWS credentials and bucket permissions

### Multiple Submissions
- **Cause**: Client-side state not persisting
- **Solution**: Now handled with localStorage and server-side validation

### Random Scrolling in Test Runner
- **Cause**: Auto-scroll to submit button
- **Solution**: Fixed with smooth scroll behavior and proper overflow handling