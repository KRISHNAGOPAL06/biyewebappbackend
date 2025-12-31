# Registration Architecture - Biye Matrimonial Platform

## Overview

The Registration Architecture implements a flexible, multi-user registration system supporting four distinct flows: **self registration**, **parent registration with candidate onboarding**, **candidate account claiming**, and **guardian invitations**. This design enables family-managed matrimonial profiles with role-based access control while maintaining secure credential management.

---

## Key Features

✅ **Self Registration** - Users create personal accounts and profiles independently  
✅ **Parent Registration** - Parents create candidate profiles and invite candidates to claim them  
✅ **Candidate Onboarding** - Invited candidates set their own credentials and verify access  
✅ **Guardian Invites** - Additional family members can be invited to manage profiles  
✅ **Role-Based Access** - Three distinct roles: parent, candidate, guardian  
✅ **Transactional Integrity** - Parent registration creates user + profile + links atomically  
✅ **Status Tracking** - CandidateLink tracks relationship status (pending → active)  
✅ **Upsert Pattern** - Reuses unverified accounts to prevent blocking re-registration  
✅ **Email Invitations** - Automated invite emails for candidates and guardians  
✅ **OTP Verification** - 6-digit OTP with 5-minute expiry for secure access  

---

## Registration Flows

### Flow 1: Self Registration

User creates their own account for personal matrimonial profile.

```
User Registration Request
    ↓
User created (role: 'candidate')
    ↓
Profile created (draft state)
    ↓
OTP sent to email
    ↓
User verifies OTP → User.isVerified = true
    ↓
✅ Account active, ready to manage profile
```

### Flow 2: Parent Registration (Primary)

Parent creates a candidate's matrimonial profile and invites them to access it.

```
Parent Registration Request
    ↓
Transaction Start:
  • Parent user created (role: 'parent')
  • Candidate user created (role: 'candidate')
  • Profile created for candidate
  • CandidateLink created (parent_userId, childUserId, role='parent', status='active')
Transaction Commit
    ↓
OTP sent to parent email
Parent verifies OTP → Parent.isVerified = true
    ↓
Candidate invite email sent
Candidate receives link to /auth/candidate/start
    ↓
Candidate clicks link → candidate/start endpoint
Candidate sets password, receives OTP
CandidateLink created (childUserId=candidate, role='candidate', status='pending')
    ↓
Candidate verifies OTP → status becomes 'active'
    ↓
✅ Both users verified, candidate can access profile
```

### Flow 3: Guardian Invitation

An existing user (parent or candidate) invites another guardian to manage a profile.

```
Invite Guardian Request (from authenticated user)
    ↓
Guardian user created (role: 'guardian')
CandidateLink created (childUserId=guardian, role='guardian', status='pending')
    ↓
Guardian invite email sent
Guardian receives link to /auth/guardian/start
    ↓
Guardian clicks link → guardian/start endpoint
Guardian sets password, receives OTP
    ↓
Guardian verifies OTP
CandidateLink status becomes 'active'
    ↓
✅ Guardian can now manage profile
```

---

## Database Models

### User Model (Login-Only)

```prisma
model User {
  id              String          @id @default(uuid())
  email           String          @unique
  firstName       String?
  lastName        String?
  phoneNumber     String?
  role            String          @default("candidate")  # candidate, parent, guardian
  passwordHash    String?
  otpHash         String?
  otpExpiry       DateTime?
  isVerified      Boolean         @default(false)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  // Relations
  sessions        Session[]
  parentLinks     CandidateLink[] @relation("ParentUser")
  childLinks      CandidateLink[] @relation("ChildUser")
  messages        Message[]
}
```

### CandidateLink Model (Updated)

```prisma
model CandidateLink {
  id            String   @id @default(uuid())
  profileId     String
  parentUserId  String
  childUserId   String?
  relationship  String?   # "son", "daughter", "brother", "sister", "self", etc.
  role          String    @default("parent")  # parent, candidate, guardian
  status        String    @default("pending")  # pending, active, revoked
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  profile       Profile   @relation(fields: [profileId], references: [id])
  parentUser    User      @relation("ParentUser", fields: [parentUserId], references: [id])
  childUser     User?     @relation("ChildUser", fields: [childUserId], references: [id])
  
  @@unique([profileId, parentUserId, role])
  @@index([childUserId])
  @@index([status])
}
```

**Key Differences from v1:**
- `profileId` - Links user to specific profile (not user to user)
- `childUserId` - Nullable; only populated for candidate/guardian roles
- `role` - Explicit role tracking (parent, candidate, guardian)
- `status` - Relationship status tracking
- Composite unique constraint prevents duplicate role links per profile

### Profile Model

```prisma
model Profile {
  id            String         @id @default(uuid())
  userId        String         @unique
  displayName   String?
  about         String?
  gender        String?
  dob           DateTime?
  location      Json?
  published     Boolean        @default(false)
  completeness  Int            @default(0)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?
  
  // Relations
  user          User           @relation(fields: [userId], references: [id])
  candidateLinks CandidateLink[]
}
```

---

## API Endpoints

### 1. Self Registration

**POST** `/api/v1/auth/register`

Register a new user account with personal profile.

**Request:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "password": "SecurePassword123!",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "role": "candidate",
      "isVerified": false
    }
  },
  "message": "OTP sent to your email. Please verify to complete registration."
}
```

**Error Response (Upsert - Existing Unverified):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "existing-user-uuid",
      "email": "user@example.com"
    }
  },
  "message": "Account exists but unverified. New OTP sent."
}
```

---

### 2. Parent Registration

**POST** `/api/v1/auth/register-parent`

Parent creates their account and a candidate profile simultaneously.

**Request:**
```json
{
  "parentEmail": "parent@example.com",
  "parentFirstName": "Ahmad",
  "parentLastName": "Khan",
  "parentPhoneNumber": "+1234567890",
  "password": "SecurePassword123!",
  "candidateEmail": "candidate@example.com",
  "candidateFirstName": "Fatima",
  "candidateLastName": "Khan",
  "candidateGender": "female",
  "candidateDob": "1998-05-15",
  "candidateCity": "New York",
  "candidateState": "NY",
  "candidateCountry": "USA",
  "candidatePhoneNumber": "+0987654321",
  "lookingFor": "alliance",
  "creatingFor": "daughter"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "parent-user-uuid",
      "email": "parent@example.com",
      "role": "parent",
      "isVerified": false
    },
    "candidateProfile": {
      "id": "profile-uuid",
      "userId": "candidate-user-uuid",
      "displayName": "Fatima Khan",
      "gender": "female",
      "published": false
    }
  },
  "message": "OTP sent to parent email. Candidate has been invited."
}
```

**Transaction Behavior:**
- ✅ Parent user created with passwordHash, otpHash, otpExpiry
- ✅ Candidate user created (unverified, no password)
- ✅ Profile created for candidate with demographics
- ✅ CandidateLink created (parent → candidate)
- ✅ Invite email sent to candidate
- ❌ If any step fails, entire transaction rolls back

---

### 3. Candidate Start (Onboarding)

**POST** `/api/v1/auth/candidate/start`

Invited candidate claims their profile and sets credentials.

**Request:**
```json
{
  "email": "candidate@example.com",
  "password": "MyPassword456!",
  "phoneNumber": "+0987654321"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "candidate-user-uuid",
      "email": "candidate@example.com",
      "role": "candidate",
      "isVerified": false
    }
  },
  "message": "OTP sent to your email. Please verify to complete your registration."
}
```

**Validation:**
- Email must exist and be unverified
- Role must be 'candidate'
- Profile must exist for this user
- CandidateLink lookup filters by `role='candidate'` only
- If no candidate link exists, creates one with status='pending'
- If candidate link already active, returns error

---

### 4. Guardian Start (Onboarding)

**POST** `/api/v1/auth/guardian/start`

Invited guardian claims their access and sets credentials.

**Request:**
```json
{
  "email": "guardian@example.com",
  "password": "MyPassword789!",
  "phoneNumber": "+1111111111"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "guardian-user-uuid",
      "email": "guardian@example.com",
      "role": "guardian",
      "isVerified": false
    }
  },
  "message": "OTP sent to your email. Please verify to complete your registration."
}
```

**Validation:**
- Email must exist and be unverified
- Role must be 'guardian'
- Must have pending CandidateLink with role='guardian'
- If link status is 'active', returns error (already registered)

---

### 5. Invite Guardian

**POST** `/api/v1/auth/invite-child` (Authenticated)

Invite another family member to manage a profile.

**Request:**
```json
{
  "profileId": "profile-uuid",
  "email": "brother@example.com",
  "firstName": "Hassan",
  "lastName": "Khan",
  "phoneNumber": "+2222222222",
  "relationship": "brother"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "candidateLink": {
      "id": "link-uuid",
      "profileId": "profile-uuid",
      "childUserId": "guardian-user-uuid",
      "role": "guardian",
      "status": "pending",
      "relationship": "brother"
    }
  },
  "message": "Invitation sent successfully."
}
```

**Authorization:**
- User must be authenticated
- User must have parent or candidate link to the profile
- Guardian user created (role: 'guardian', unverified)
- CandidateLink created with status='pending'
- Invite email sent to guardian

---

### 6. Verify OTP

**POST** `/api/v1/auth/verify`

Verify OTP for any registration flow (self, candidate, guardian).

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "isVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-uuid"
  },
  "message": "Email verified successfully. Login successful."
}
```

**Side Effects:**
- User.isVerified = true
- All CandidateLink records for this user with status='pending' → status='active'
- Session created with device tracking
- JWT access token generated
- Refresh token stored in Redis

---

### 7. Login

**POST** `/api/v1/auth/login`

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "role": "candidate",
      "isVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-uuid"
  },
  "message": "Login successful."
}
```

---

## Data Models - Relationship Examples

### Scenario 1: Parent + Candidate (Parent Registration)

```
User (parent-1)
├── CandidateLink (role='parent', status='active')
│   ├── profileId: profile-1
│   └── childUserId: null

User (candidate-1)
└── CandidateLink (role='candidate', status='active')
    ├── profileId: profile-1
    └── parentUserId: parent-1

Profile (profile-1)
└── userId: candidate-1
```

### Scenario 2: Multiple Guardians + Profile

```
User (parent-1)
├── CandidateLink (role='parent', status='active')
│   └── profileId: profile-1

User (candidate-1)
├── CandidateLink (role='candidate', status='active')
│   └── profileId: profile-1

User (guardian-brother)
├── CandidateLink (role='guardian', status='active')
│   ├── profileId: profile-1
│   └── relationship: 'brother'

User (guardian-sister)
└── CandidateLink (role='guardian', status='active')
    ├── profileId: profile-1
    └── relationship: 'sister'

Profile (profile-1)
└── userId: candidate-1
```

---

## Validation Rules

### Email Registration

- **Email format**: Valid RFC 5322 email address
- **Unique per role**: Same email cannot exist for same role (self/parent/guardian)
- **Already verified**: If email verified, must login instead
- **Rate limit**: Max 3 OTP requests per email per 15 minutes

### Password

- **Minimum length**: 8 characters
- **Complexity**: Must include uppercase, lowercase, number, special character
- **Hash algorithm**: bcryptjs with salt rounds 10

### OTP

- **Format**: 6 digits
- **Expiry**: 5 minutes from generation
- **Rate limit**: 5 attempts per email, 10 per IP before lockout
- **Hash storage**: Always hashed with bcryptjs before database storage

### Parent Registration

- **Parent email**: Valid, unique, unverified (or allow upsert of existing unverified)
- **Candidate email**: Valid, unique, can be new or existing unverified
- **Phone numbers**: Optional but if provided, valid E.164 format
- **Date of birth**: Valid ISO 8601 date, age 18+ (for candidate)

### Guardian Invitation

- **Profile**: Must exist and user must have access
- **Guardian email**: Valid, not already associated with this profile in active state
- **Relationship**: Predefined values: father, mother, brother, sister, uncle, aunt, etc.

---

## Security & Permissions

### Authentication Levels

| Context | Requirements |
|---------|--------------|
| Public endpoints | No authentication |
| User profile access | Must be authenticated |
| Profile management | Must be owner or guardian with access |
| Guardian invites | Must be profile owner or existing guardian |

### Authorization Rules

**Self Registration:**
- Any unauthenticated user
- Creates personal candidate account

**Parent Registration:**
- Any unauthenticated user
- Creates parent account + candidate profile (transactional)

**Candidate Onboarding:**
- Invited candidate with unverified account
- Must claim profile before verification

**Guardian Invitation:**
- Authenticated user (parent, candidate, or guardian)
- Must have access to profile being shared

### Token Security

- **Access Token**: 15-minute expiry, contains userId, email, sessionId
- **Refresh Token**: 7-day expiry, stored in Redis, rotated on refresh
- **Token Reuse Detection**: Previous refresh tokens invalidated on new refresh
- **Session Binding**: Tokens bound to device/IP for additional security

---

## Database Schema Notes

### CandidateLink Uniqueness

The unique constraint `@@unique([profileId, parentUserId, role])` ensures:
- Only ONE parent link per profile
- Multiple candidate links allowed (for future multi-candidate profiles)
- Multiple guardian links allowed (multiple family members)

**Example Valid States:**
```
✅ profileId=1, parentUserId=A, role='parent'    # Parent link
✅ profileId=1, parentUserId=null, childUserId=B, role='candidate'
✅ profileId=1, parentUserId=null, childUserId=C, role='guardian'
❌ profileId=1, parentUserId=A, role='parent' (duplicate)
❌ profileId=1, parentUserId=B, role='parent' (violates single parent)
```

---

## Error Handling

### Registration Errors

```json
{
  "success": false,
  "error": {
    "message": "Email already exists and is verified. Please log in instead.",
    "code": "EMAIL_ALREADY_EXISTS"
  }
}
```

### Candidate Start Errors

```json
{
  "success": false,
  "error": {
    "message": "No invitation found for this email address.",
    "code": "INVALID_INVITATION"
  }
}
```

```json
{
  "success": false,
  "error": {
    "message": "This email is not associated with a candidate account.",
    "code": "INVALID_ROLE"
  }
}
```

### OTP Verification Errors

```json
{
  "success": false,
  "error": {
    "message": "OTP expired. Request a new one.",
    "code": "OTP_EXPIRED"
  }
}
```

```json
{
  "success": false,
  "error": {
    "message": "Too many OTP attempts. Try again in 15 minutes.",
    "code": "OTP_RATE_LIMIT"
  }
}
```

---

## Complete Flow Examples

### Example 1: Parent Registration → Candidate Onboarding

```javascript
// Step 1: Parent registers
POST /api/v1/auth/register-parent
{
  "parentEmail": "amina@example.com",
  "parentFirstName": "Amina",
  "parentLastName": "Ahmed",
  "password": "Secure123!",
  "candidateEmail": "zahra@example.com",
  "candidateFirstName": "Zahra",
  "candidateLastName": "Ahmed",
  "candidateGender": "female",
  "candidateDob": "1999-03-20",
  "candidateCity": "London",
  "candidateState": "England",
  "candidateCountry": "UK",
  "creatingFor": "daughter"
}

// Response: OTP sent to amina@example.com

// Step 2: Parent verifies OTP
POST /api/v1/auth/verify
{
  "email": "amina@example.com",
  "otp": "123456"
}

// Response: Parent login successful

// Step 3: Candidate receives invite email
// Candidate clicks "Claim Profile" link → /auth/candidate/start

// Step 4: Candidate sets credentials
POST /api/v1/auth/candidate/start
{
  "email": "zahra@example.com",
  "password": "MyPassword456!",
  "phoneNumber": "+447911123456"
}

// Response: OTP sent to zahra@example.com

// Step 5: Candidate verifies OTP
POST /api/v1/auth/verify
{
  "email": "zahra@example.com",
  "otp": "654321"
}

// Response: Candidate login successful
// CandidateLink status becomes 'active'
// Both users can now manage profile
```

### Example 2: Guardian Invitation

```javascript
// Parent/Candidate invites sibling as guardian
POST /api/v1/auth/invite-child (authenticated as parent-1)
{
  "profileId": "profile-1",
  "email": "brother@example.com",
  "firstName": "Ali",
  "lastName": "Ahmed",
  "phoneNumber": "+447911999888",
  "relationship": "brother"
}

// Brother receives invite email
// Brother navigates to /auth/guardian/start

// Brother sets credentials
POST /api/v1/auth/guardian/start
{
  "email": "brother@example.com",
  "password": "BrotherPassword789!",
  "phoneNumber": "+447911999888"
}

// Response: OTP sent to brother@example.com

// Brother verifies
POST /api/v1/auth/verify
{
  "email": "brother@example.com",
  "otp": "789012"
}

// Response: Guardian login successful
// Can now manage the profile alongside parent/candidate
```

---

## Testing Guide

### Postman Collection Setup

```json
{
  "variable": [
    {
      "key": "BASE_URL",
      "value": "http://localhost:3000/api/v1"
    },
    {
      "key": "PARENT_EMAIL",
      "value": "test.parent@example.com"
    },
    {
      "key": "CANDIDATE_EMAIL",
      "value": "test.candidate@example.com"
    },
    {
      "key": "PARENT_TOKEN",
      "value": ""
    },
    {
      "key": "CANDIDATE_TOKEN",
      "value": ""
    }
  ]
}
```

### Test Sequence

1. **Register Parent** - POST /auth/register-parent
2. **Get OTP** - Check email service logs
3. **Verify Parent** - POST /auth/verify (save PARENT_TOKEN)
4. **Candidate Start** - POST /auth/candidate/start
5. **Verify Candidate** - POST /auth/verify (save CANDIDATE_TOKEN)
6. **Login Both** - POST /auth/login for both users
7. **Invite Guardian** - POST /auth/invite-child (using PARENT_TOKEN)
8. **Guardian Start & Verify** - Repeat steps 4-5 for guardian

---

## Migration Commands

Run these in order:

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Create and apply migration
npx prisma migrate dev --name registration_architecture_update

# 3. Verify schema
npx prisma db push

# 4. Run tests
npm test src/modules/auth/auth.service.test.ts
```

---

## Environment Variables Required

```env
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@biye.com
DATABASE_URL=postgresql://user:password@localhost:5432/biye
REDIS_URL=redis://localhost:6379
```

---

## Next Steps

1. **Email Templates** - Create HTML templates for invite emails
2. **Rate Limiting** - Implement enhanced rate limiting per user/IP
3. **Phone OTP** - Add SMS OTP alternative (SMS provider integration)
4. **Social Login** - Add Google/Facebook OAuth options
5. **Two-Factor Auth** - Implement 2FA with authenticator apps
6. **Account Recovery** - Add forgotten password flow
7. **Email Verification Links** - Add time-limited verification links as alternative to OTP
8. **Guardian Permissions** - Implement granular permissions (who can view, edit, invite, etc.)
9. **Audit Logging** - Track all registration actions for compliance
10. **Analytics** - Monitor registration funnel and conversion rates
