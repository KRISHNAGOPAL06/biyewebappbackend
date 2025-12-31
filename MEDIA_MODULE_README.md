# Media/Photo Upload Module - Implementation Guide

## Overview
This module implements a secure, production-ready photo upload system with:
- Signed upload URLs for direct browser uploads to S3/Cloudinary
- Server-side validation (MIME type, file size, privacy level)
- Photo metadata storage (no raw image data in DB)
- Moderation webhook support
- Privacy-based photo access control
- Background job stubs for moderation and deletion

## Files Created/Modified

### Core Module Files
```
src/modules/media/
├── upload.dto.ts              # Zod validation schemas
├── media.service.ts           # Core business logic
├── media.controller.ts        # HTTP request handlers
├── media.routes.ts            # API endpoint definitions
├── s3.service.ts              # AWS S3 presigned URL generation (stub)
├── cloudinary.service.ts      # Cloudinary upload params (stub)
├── moderation.service.ts      # Moderation callback handler
├── moderation.controller.ts   # Moderation webhook endpoint
├── moderation.routes.ts       # Moderation routes
├── media.test.ts              # Unit tests (do NOT run in Replit)
└── openapi.media.yml          # OpenAPI 3.0 documentation
```

### Supporting Files
```
src/modules/profile/
└── profile.photos.routes.ts   # GET /profiles/:profileId/photos endpoint

prisma/
└── schema.prisma              # Updated Photo model with new fields

src/
├── config/env.ts              # Added media-related env vars
└── index.ts                   # Registered new routes
```

## Database Schema Changes

### Updated Photo Model
```prisma
model Photo {
  id               String    @id @default(uuid())
  profileId        String
  objectKey        String?   # S3 key or Cloudinary public_id
  url              String?   # CDN URL (filled after moderation)
  fileSize         Int?      # bytes
  mimeType         String?   # image/jpeg, image/png, etc.
  privacyLevel     String    @default("public") # public | matches | on_request | private
  moderationStatus String    @default("pending") # pending | approved | rejected
  moderationNote   String?   # reason if rejected
  createdAt        DateTime  @default(now())
  uploadedAt       DateTime? # when upload completed
  deletedAt        DateTime? # soft delete
  profile          Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
}
```

## Environment Variables

Add these to your `.env` file:

```bash
# Upload Configuration
UPLOAD_PROVIDER=s3                    # or 'cloudinary'
MAX_UPLOAD_BYTES=5242880              # 5MB default
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/avif
UPLOAD_URL_EXPIRY_SECONDS=300         # 5 minutes

# AWS S3 Configuration (if UPLOAD_PROVIDER=s3)
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Cloudinary Configuration (if UPLOAD_PROVIDER=cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Moderation Webhook Security
MODERATION_SECRET=your-32-char-minimum-secret-key-here
```

## Local Installation & Setup

### 1. Install Dependencies

**AWS S3 Support:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Cloudinary Support:**
```bash
npm install cloudinary
```

### 2. Run Database Migration
```bash
npx prisma migrate dev --name add_photo_media_fields
```

This will:
- Add new fields to the Photo table (mimeType, moderationNote, uploadedAt, deletedAt)
- Generate updated Prisma client

### 3. Configure Environment
Copy the environment variables above to your `.env` file and fill in your actual credentials.

### 4. Start Server
```bash
npm run dev
```

## API Endpoints

### 1. Request Upload URL
**POST** `/api/v1/media/upload-url`

**Headers:**
```
Authorization: Bearer <access-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "profileId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "profile-photo.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 1048576,
  "privacyLevel": "public"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://bucket.s3.amazonaws.com/profiles/...",
    "objectKey": "profiles/550e8400.../abc123_profile-photo.jpg",
    "expiresIn": 300,
    "uploadMethod": "PUT",
    "photoId": "660e8400-e29b-41d4-a716-446655440001"
  },
  "message": "Upload URL created successfully"
}
```

**Validation:**
- User must own the profile
- MIME type must be in ALLOWED_MIME_TYPES
- File size must be ≤ MAX_UPLOAD_BYTES
- Privacy level must be: public, matches, on_request, or private

### 2. Get Photo Metadata
**GET** `/api/v1/media/:photoId`

**Headers:** (optional)
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "profileId": "550e8400-e29b-41d4-a716-446655440000",
    "objectKey": "profiles/...",
    "url": "https://cdn.example.com/photo.jpg",
    "fileSize": 1048576,
    "mimeType": "image/jpeg",
    "privacyLevel": "public",
    "moderationStatus": "approved",
    "moderationNote": null,
    "createdAt": "2025-11-22T10:00:00Z",
    "uploadedAt": "2025-11-22T10:05:00Z"
  }
}
```

**Privacy Rules:**
- Public photos: visible to everyone
- Private/restricted photos: only visible to owner or authorized users
- Pending/rejected photos: URL is null for non-owners

### 3. Delete Photo
**DELETE** `/api/v1/media/:photoId`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Photo deleted successfully"
}
```

**Behavior:**
- Sets `deletedAt` timestamp (soft delete)
- Enqueues background job to delete from S3/Cloudinary
- Owner-only operation

### 4. List Profile Photos
**GET** `/api/v1/profiles/:profileId/photos`

**Headers:** (optional)
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    { /* PhotoMetadata */ },
    { /* PhotoMetadata */ }
  ]
}
```

**Filtering:**
- Profile owner sees all photos (including pending)
- Others see only approved + public/matched photos

### 5. Moderation Callback (Webhook)
**POST** `/api/v1/media/moderation/callback`

**Headers:**
```
X-Moderation-Secret: your-secret-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "objectKey": "profiles/550e8400.../abc123_profile-photo.jpg",
  "status": "approved",
  "finalUrl": "https://cdn.example.com/optimized-photo.jpg",
  "fileSize": 1048576,
  "mimeType": "image/jpeg",
  "note": "Optional moderation note"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "success": true },
  "message": "Moderation callback processed"
}
```

**Security:**
- Requires `X-Moderation-Secret` header
- Constant-time comparison to prevent timing attacks
- Rate-limited (100 requests per 5 minutes)

## Security Features Implemented

### 1. Upload URL Generation
- ✅ User must own the profile (server-side check)
- ✅ MIME type validation against whitelist
- ✅ File size validation before signing
- ✅ Unpredictable object keys (UUID-based)
- ✅ Short-lived signed URLs (5 minutes default)
- ✅ Privacy level validation

### 2. Moderation Callback
- ✅ X-Moderation-Secret header required
- ✅ Constant-time secret comparison
- ✅ Rate limiting (100/5min)
- ✅ Audit logging with requestId

### 3. Photo Access Control
- ✅ Privacy level enforcement
- ✅ Moderation status filtering
- ✅ Owner vs. public view distinction
- ✅ Soft delete support

## Background Worker Integration (Stubs)

### Moderation Queue
Location: `media.service.ts` → `enqueueModerationJob()`

**Purpose:** After upload URL is issued, enqueue a job for the background worker.

**Job Payload:**
```typescript
{
  photoId: string;
  objectKey: string;
  profileId: string;
  notifyOwner: boolean;
}
```

**Worker Responsibilities:**
1. Download image from S3/Cloudinary using objectKey
2. Run moderation checks (AI, NSFW detection, etc.)
3. POST to `/api/v1/media/moderation/callback` with result

### Deletion Queue
Location: `media.service.ts` → `enqueueDeletionJob()`

**Purpose:** Delete object from S3/Cloudinary after soft delete.

**Job Payload:**
```typescript
{
  objectKey: string;
  provider: 's3' | 'cloudinary';
}
```

## Testing

### Unit Tests
Location: `src/modules/media/media.test.ts`

**Run tests locally (NOT in Replit):**
```bash
npm test
```

**Test Coverage:**
- ✅ MIME type validation
- ✅ File size validation
- ✅ S3 presigned URL generation (mocked)
- ✅ Cloudinary upload params (mocked)
- ✅ Moderation secret validation
- ✅ Moderation callback processing (mocked)

### Manual Testing with Postman/Thunder Client

1. **Get Access Token:**
   - POST `/api/v1/auth/login` → Verify OTP → Get token

2. **Request Upload URL:**
   - POST `/api/v1/media/upload-url` with Bearer token

3. **Upload to S3/Cloudinary:**
   - Use the returned `uploadUrl` to PUT/POST the image directly

4. **Simulate Moderation Callback:**
   - POST `/api/v1/media/moderation/callback` with X-Moderation-Secret

5. **Verify Photo Metadata:**
   - GET `/api/v1/media/:photoId`
   - Check that `url` is populated and `moderationStatus` is "approved"

## Production Deployment Checklist

- [ ] Configure AWS IAM user with S3 PutObject permissions only
- [ ] Set S3 bucket CORS policy to allow PUT from your frontend domain
- [ ] Generate strong MODERATION_SECRET (32+ chars)
- [ ] Set up background worker (Bull, BullMQ, or similar)
- [ ] Configure worker to POST to moderation callback endpoint
- [ ] Enable CloudFront or Cloudinary CDN for final URLs
- [ ] Set up monitoring for upload failures
- [ ] Configure alerts for rejected photos
- [ ] Test rate limiting under load
- [ ] Verify constant-time secret comparison in production

## Implementation Notes

### Why No Actual SDK Calls?
Per your requirements, this implementation creates **stub service files** that:
- Show the correct structure and interfaces
- Include installation instructions as comments
- Do NOT attempt to connect to AWS/Cloudinary from Replit
- Will work when you install dependencies and configure env vars locally

### Next Steps for Full Implementation

When ready to use actual AWS S3:

1. **Install SDK:**
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

2. **Update `s3.service.ts`:**
   ```typescript
   import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
   import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
   
   const s3Client = new S3Client({
     region: env.AWS_REGION,
     credentials: {
       accessKeyId: env.AWS_ACCESS_KEY_ID!,
       secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
     },
   });
   
   async createPresignedPutUrl(params: S3UploadParams) {
     const command = new PutObjectCommand({
       Bucket: params.bucket,
       Key: params.key,
       ContentType: params.contentType,
     });
     
     const url = await getSignedUrl(s3Client, command, {
       expiresIn: params.expiresSeconds,
     });
     
     return { url, expiresAt: new Date(Date.now() + params.expiresSeconds * 1000) };
   }
   ```

When ready to use Cloudinary:

1. **Install SDK:**
   ```bash
   npm install cloudinary
   ```

2. **Update `cloudinary.service.ts`:**
   ```typescript
   import { v2 as cloudinary } from 'cloudinary';
   
   cloudinary.config({
     cloud_name: env.CLOUDINARY_CLOUD_NAME,
     api_key: env.CLOUDINARY_API_KEY,
     api_secret: env.CLOUDINARY_API_SECRET,
   });
   
   async createSignedUploadParams(params: CloudinaryUploadParams) {
     const timestamp = Math.floor(Date.now() / 1000);
     const signature = cloudinary.utils.api_sign_request(
       { timestamp, folder: params.folder, public_id: params.publicId },
       env.CLOUDINARY_API_SECRET!
     );
     
     // Return signed params...
   }
   ```

## OpenAPI Documentation

Full API documentation is available in:
- `src/modules/media/openapi.media.yml`

View in Swagger UI or Redoc for interactive testing.

---

**Note:** I did not run any installs, migrations, or network calls as requested. All files have been created with proper structure and security implementations. You can now test locally with your own database and cloud storage credentials.
