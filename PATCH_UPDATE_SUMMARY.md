# Auth Module Patch Update - Password + OTP 2-Step Login

## Summary

Successfully patched the authentication module to implement **email + password login with OTP 2-step verification**. Registration now requires a password, and login verifies the password before sending an OTP.

---

## Changes Made

### 1. **Prisma Schema Update** ✅

**File:** `prisma/schema.prisma`

**Change:** Added `passwordHash` field to User model

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  fullName     String?
  phoneNumber  String?
  passwordHash String?   // NEW FIELD
  isVerified   Boolean   @default(false)
  otpHash      String?
  otpExpiry    DateTime?
  sessions     Session[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

**Migration Required:** Run `npx prisma migrate dev --name add_password_hash`

---

### 2. **DTO/Validation Schema Updates** ✅

**File:** `src/modules/auth/auth.dto.ts`

**Changes:**

**RegisterSchema** - Now requires password:
```typescript
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'), // NEW
});
```

**LoginSchema** - Now requires password:
```typescript
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password is required'), // NEW
});
```

---

### 3. **Email Service Implementation** ✅

**File:** `src/modules/auth/email.service.ts`

**Change:** Implemented **real Nodemailer** integration (replacing stub)

**Key Features:**
- SMTP transporter with configurable host/port/auth
- HTML email templates for OTP and welcome emails
- Error handling with try-catch
- Development mode OTP logging
- Configurable `EMAIL_FROM` address

**Configuration Required:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Biye" <noreply@biye.com>
```

---

### 4. **Auth Service Updates** ✅

**File:** `src/modules/auth/auth.service.ts`

#### **Registration Flow:**
1. ✅ Hash password with bcrypt (10 rounds)
2. ✅ Save `passwordHash` to database
3. ✅ Generate OTP (6 digits)
4. ✅ Hash OTP and save with expiry
5. ✅ Send OTP email
6. ✅ **NO auto-login** - user must verify OTP first

**Code Changes:**
```typescript
const passwordHash = await bcrypt.hash(password, 10);
// Save passwordHash in user creation/update
```

#### **Login Flow:**
1. ✅ Check if user exists and is verified
2. ✅ Verify password with bcrypt.compare()
3. ✅ If password matches → generate OTP
4. ✅ Save OTP hash + expiry
5. ✅ Send OTP email
6. ✅ Return `{ success: true, otpSent: true }`
7. ✅ **NO tokens issued at login**

**New Login Logic:**
```typescript
const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
if (!isPasswordValid) {
  throw new Error('Invalid email or password.');
}
// Then generate and send OTP
```

#### **Verification Flow (No Changes):**
- Still accepts `{ email, otp }`
- Issues access token + refresh token only after OTP verification
- Creates session entry

---

### 5. **Auth Controller Updates** ✅

**File:** `src/modules/auth/auth.controller.ts`

**Changes:**

**Login Method:**
```typescript
async login(req: Request, res: Response, next: NextFunction) {
  const dto: LoginDTO = req.body; // Now includes { email, password }
  const result = await authService.login(dto);
  return successResponse(res, result, 'OTP sent to your email. Please verify to login.', 200);
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "otpSent": true
  },
  "message": "OTP sent to your email. Please verify to login."
}
```

---

### 6. **Environment Variables** ✅

**File:** `.env.example`

**New Variables Added:**
```env
# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Biye" <noreply@biye.com>
```

---

## Updated Authentication Flow

### **Registration Flow:**
```
1. POST /api/v1/auth/register
   Body: { email, fullName, phoneNumber, password }
   
2. Server:
   - Hash password with bcrypt
   - Save user with passwordHash
   - Generate 6-digit OTP
   - Hash OTP and save with expiry
   - Send OTP email via Nodemailer
   
3. Response: { success: true, message: "OTP sent..." }

4. POST /api/v1/auth/verify
   Body: { email, otp }
   
5. Server:
   - Validate OTP
   - Mark user verified
   - Create session
   - Issue access + refresh tokens
   
6. Response: { accessToken, user }
```

### **Login Flow:**
```
1. POST /api/v1/auth/login
   Body: { email, password }
   
2. Server:
   - Find user by email
   - Verify user is verified
   - Compare password with bcrypt
   - If valid → generate OTP
   - Send OTP email
   
3. Response: { success: true, otpSent: true }

4. POST /api/v1/auth/verify
   Body: { email, otp }
   
5. Server:
   - Validate OTP
   - Create new session
   - Issue access + refresh tokens
   
6. Response: { accessToken, user }
```

---

## API Endpoint Changes

### **POST /api/v1/auth/register**
**Before:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+1234567890"
}
```

**After:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+1234567890",
  "password": "SecurePass123"
}
```

### **POST /api/v1/auth/login**
**Before:**
```json
{
  "email": "user@example.com"
}
```

**After:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "otpSent": true
  },
  "message": "OTP sent to your email. Please verify to login."
}
```

### **POST /api/v1/auth/verify** (No Change)
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

---

## Files Modified

1. ✅ `prisma/schema.prisma` - Added passwordHash field
2. ✅ `src/modules/auth/auth.dto.ts` - Updated validation schemas
3. ✅ `src/modules/auth/email.service.ts` - Implemented Nodemailer
4. ✅ `src/modules/auth/auth.service.ts` - Added password hashing/verification
5. ✅ `src/modules/auth/auth.controller.ts` - Updated login response
6. ✅ `.env.example` - Added email configuration

---

## Local Setup Steps

### 1. Install Nodemailer (if not already installed)
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Update Environment Variables
```bash
# Edit .env and add:
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Biye" <noreply@biye.com>
```

**For Gmail:**
- Use App Password instead of regular password
- Enable 2FA on Gmail account
- Generate App Password: https://myaccount.google.com/apppasswords

### 3. Run Database Migration
```bash
npx prisma migrate dev --name add_password_hash
```

### 4. Regenerate Prisma Client
```bash
npx prisma generate
```

### 5. Start Development Server
```bash
npm run dev
```

---

## Testing the Changes

### 1. Register a New User
```bash
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "fullName": "Test User",
  "password": "TestPass123"
}
```

**Expected:** OTP sent via email

### 2. Verify Registration
```bash
POST http://localhost:3000/api/v1/auth/verify
Content-Type: application/json

{
  "email": "test@example.com",
  "otp": "123456"
}
```

**Expected:** Access token + user data returned

### 3. Login with Password
```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "TestPass123"
}
```

**Expected:** `{ otpSent: true }` and OTP sent via email

### 4. Verify Login OTP
```bash
POST http://localhost:3000/api/v1/auth/verify
Content-Type: application/json

{
  "email": "test@example.com",
  "otp": "654321"
}
```

**Expected:** New access token + session created

---

## Security Notes

✅ Passwords hashed with bcrypt (10 rounds)  
✅ OTPs hashed with bcrypt before storage  
✅ Password never stored in plain text  
✅ Password never logged  
✅ Rate limiting still active (3 OTP/15min per email)  
✅ OTP still expires after 5 minutes  
✅ Failed password attempts logged for monitoring  

---

## Breaking Changes

⚠️ **BREAKING:** Registration now requires `password` field  
⚠️ **BREAKING:** Login now requires `password` field  
⚠️ **BREAKING:** Old users without passwordHash cannot login (need password reset flow)  

---

## What Was NOT Changed

✅ Token system (access + refresh tokens)  
✅ Session management  
✅ Token rotation logic  
✅ Refresh endpoint  
✅ Logout endpoint  
✅ /me endpoint  
✅ Rate limiting rules  
✅ OTP verification flow  

---

## Next Steps (Optional)

1. **Password Reset Flow** - Allow users to reset forgotten passwords
2. **Email Templates** - Improve email HTML design
3. **Email Provider** - Switch to SendGrid/AWS SES for production
4. **Password Strength Meter** - Add frontend validation
5. **Account Recovery** - Implement backup email/phone
