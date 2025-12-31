# Authentication Module - Implementation Complete

## Overview

This authentication module implements a production-grade email OTP-based authentication system with JWT access tokens and rotating refresh tokens.

## Features Implemented

- ✅ Email-based OTP registration and login
- ✅ Bcrypt-hashed OTP storage with expiry (5 minutes)
- ✅ JWT access tokens (15 minute expiry)
- ✅ Rotating refresh tokens stored in Redis
- ✅ HttpOnly, Secure cookies for refresh tokens
- ✅ Session tracking (device ID, IP, user agent)
- ✅ Token reuse detection
- ✅ Rate limiting (OTP: 3 per 15 min per email, 5 per IP)
- ✅ Full Zod validation on all endpoints
- ✅ Comprehensive unit tests
- ✅ OpenAPI documentation

## File Structure

```
backend/
├── prisma/
│   └── schema.prisma              # Updated with User and Session models
├── src/
│   ├── config/
│   │   ├── env.ts                 # Updated with new JWT env variables
│   │   └── redis.ts               # NEW - Redis client wrapper
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.types.ts      # NEW - Type definitions
│   │       ├── auth.dto.ts        # NEW - Zod validation schemas
│   │       ├── email.service.ts   # NEW - Email OTP service (stub)
│   │       ├── token.service.ts   # NEW - JWT & refresh token management
│   │       ├── session.service.ts # NEW - Session tracking service
│   │       ├── auth.service.ts    # NEW - Core authentication logic
│   │       ├── auth.controller.ts # NEW - Request handlers
│   │       ├── auth.routes.ts     # NEW - Route definitions
│   │       └── auth.test.ts       # NEW - Unit tests
│   ├── middleware/
│   │   └── authMiddleware.ts      # UPDATED - JWT validation with session check
│   └── index.ts                   # UPDATED - Register auth routes
├── .env.example                   # UPDATED - New environment variables
└── openapi-auth.yaml              # NEW - Complete API documentation
```

## Database Schema Changes

### User Model (Updated)
```prisma
model User {
  id          String    @id @default(uuid())
  email       String    @unique
  fullName    String?
  phoneNumber String?
  isVerified  Boolean   @default(false)
  otpHash     String?
  otpExpiry   DateTime?
  sessions    Session[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Session Model (New)
```prisma
model Session {
  id         String   @id @default(uuid())
  userId     String
  deviceId   String?
  ip         String?
  userAgent  String?
  revoked    Boolean  @default(false)
  createdAt  DateTime @default(now())
  lastSeenAt DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

All endpoints are under `/api/v1/auth/`

### 1. POST /register
**Body:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+1234567890"
}
```

**Response:** (201)
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "OTP sent to your email. Please verify to complete registration."
  }
}
```

**Features:**
- Creates new unverified user or resends OTP for existing unverified users
- Generates 6-digit OTP
- Hashes OTP with bcrypt (never stores plain OTP)
- Sets 5-minute expiry
- Rate limited: 3 OTP per 15 min per email, 5 requests per 15 min per IP

---

### 2. POST /verify
**Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:** (200)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+1234567890",
      "isVerified": true,
      "createdAt": "2025-11-16T..."
    }
  }
}
```

**Features:**
- Validates OTP against hashed value
- Checks expiry
- Marks user as verified
- Creates new session with device/IP/UA tracking
- Generates JWT access token (15m expiry)
- Generates UUID refresh token, stores hashed in Redis (7d expiry)
- Sets refresh token in HttpOnly, Secure, SameSite=Strict cookie
- Sends welcome email
- Rate limited: 10 requests per 15 min per IP

---

### 3. POST /login
**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** (200)
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "OTP sent to your email. Please verify to login."
  }
}
```

**Features:**
- Only allows verified users to login
- Generates and sends login OTP
- Same rate limiting as register
- After OTP is sent, user verifies using /verify endpoint

---

### 4. POST /refresh
**Headers:**
```
Cookie: refreshToken=<token>
```

**Response:** (200)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}
```

**Features:**
- Reads refresh token from HttpOnly cookie
- Verifies token exists in Redis
- Checks session is not revoked
- **Rotates token:** deletes old, creates new
- Returns new access token
- Sets new refresh token cookie
- Updates session lastSeenAt
- **Token reuse detection:** if old token is used again, invalidates ALL user tokens
- Rate limited: 10 requests per 15 min per IP

---

### 5. POST /logout
**Headers:**
```
Authorization: Bearer <access_token>
Cookie: refreshToken=<token>
```

**Response:** (200)
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

**Features:**
- Requires valid access token
- Invalidates refresh token in Redis
- Revokes session in database
- Clears refresh token cookie

---

### 6. GET /me
**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "isVerified": true,
    "createdAt": "2025-11-16T..."
  }
}
```

**Features:**
- Requires valid access token
- Returns user data (no sensitive fields like otpHash)
- Updates session activity

---

## Environment Variables

Add these to your `.env` file:

```env
# Existing
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379

# New JWT variables
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Existing
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000
```

## Security Features

1. **OTP Security:**
   - Never stores plain OTP (bcrypt hashed)
   - 5-minute expiry
   - Rate limited (3 per 15 min per email)
   - Not logged in production

2. **JWT Security:**
   - Access tokens: 15-minute expiry
   - Refresh tokens: UUID-based, stored hashed in Redis
   - Separate secrets for access and refresh tokens
   - Token rotation on refresh

3. **Cookie Security:**
   - HttpOnly (prevents XSS)
   - Secure (HTTPS only in production)
   - SameSite=Strict (prevents CSRF)
   - Path=/ (scoped to auth endpoints)

4. **Session Security:**
   - Tracks device ID, IP, user agent
   - Session validation on every protected request
   - Can be revoked individually or all at once
   - Updates lastSeenAt for activity tracking

5. **Token Reuse Detection:**
   - If a used refresh token is presented again, all user tokens are invalidated
   - Protects against token theft

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Update Environment Variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Run Database Migration
```bash
npx prisma migrate dev --name add_auth_module
```

### 5. Start Redis
```bash
# Make sure Redis is running locally
redis-server
```

### 6. Start Development Server
```bash
npm run dev
```

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## API Documentation

Complete OpenAPI 3.0 specification is available in `openapi-auth.yaml`.

You can view it using:
- Swagger UI
- Postman (import the YAML file)
- Any OpenAPI viewer

## Authentication Flow

### Registration Flow:
1. Client calls `POST /register` with email
2. Server creates unverified user, sends OTP via email
3. Client calls `POST /verify` with email + OTP
4. Server validates OTP, creates session, returns access token + sets refresh cookie
5. Client stores access token, uses it for authenticated requests

### Login Flow:
1. Client calls `POST /login` with email
2. Server sends OTP to verified user's email
3. Client calls `POST /verify` with email + OTP (same as registration)
4. Server validates OTP, creates new session, returns tokens

### Token Refresh Flow:
1. When access token expires (after 15 min), client calls `POST /refresh`
2. Server validates refresh token from cookie, rotates it
3. Server returns new access token, sets new refresh cookie
4. Client uses new access token

### Logout Flow:
1. Client calls `POST /logout` with access token + refresh cookie
2. Server invalidates refresh token, revokes session, clears cookie
3. Client discards access token

## Notes

- Email service is currently a stub (logs OTP instead of sending email)
- In development mode, OTP is logged for testing
- All endpoints return standardized response format
- All errors are handled by centralized error handler
- Rate limiting is enforced at both IP and email level
- Session tracking enables features like "active sessions" view

## Next Steps

To integrate email sending:
1. Update `src/modules/auth/email.service.ts`
2. Add email provider credentials to `.env`
3. Install email library (nodemailer, sendgrid, etc.)
4. Implement actual email sending logic

To add more features:
1. Password reset flow
2. Email change flow
3. Two-factor authentication
4. Social login (OAuth)
5. Active sessions management endpoint
6. Device management (revoke specific sessions)
