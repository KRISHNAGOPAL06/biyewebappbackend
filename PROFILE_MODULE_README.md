# Profile Module - Biye Matrimonial Platform

## Overview

The Profile Module implements a comprehensive profile management system with a **draft → publish** workflow, step-by-step profile wizard, completeness tracking, privacy controls, and permission-based field masking.

---

## Features

✅ **Draft/Publish Workflow** - Users create draft profiles and publish when ready  
✅ **Step-by-Step Profile Wizard** - 7 distinct steps for gradual profile building  
✅ **Completeness Meter** - Dynamic calculation (0-100%) based on filled sections  
✅ **Photo Metadata Linking** - Track photos with privacy levels and moderation status  
✅ **Partner Preferences** - Comprehensive preference system with JSON flexibility  
✅ **Profile Masking** - Field-level privacy based on viewer permissions  
✅ **Publish Requirements** - Validation of mandatory fields before publishing  
✅ **Soft Delete** - Profiles can be deleted without permanent data loss  

---

## Database Models

### Profile Model

```prisma
model Profile {
  id           String      @id @default(uuid())
  userId       String      @unique
  displayName  String
  headline     String?
  about        String?
  gender       String?
  dob          DateTime?
  location     Json?
  published    Boolean     @default(false)
  completeness Int         @default(0)
  photos       Photo[]
  preferences  Preference?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?
  user         User        @relation(fields: [userId], references: [id])
}
```

### Photo Model

```prisma
model Photo {
  id               String   @id @default(uuid())
  profileId        String
  objectKey        String?
  url              String?
  fileSize         Int?
  privacyLevel     String   @default("public")    # public, private, on_request
  moderationStatus String   @default("pending")   # pending, approved, rejected
  createdAt        DateTime @default(now())
  profile          Profile  @relation(fields: [profileId], references: [id])
}
```

### Preference Model

```prisma
model Preference {
  id        String   @id @default(uuid())
  profileId String   @unique
  basic     Json?
  lifestyle Json?
  education Json?
  community Json?
  location  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  profile   Profile  @relation(fields: [profileId], references: [id])
}
```

---

## API Endpoints

### 1. Create Profile

**POST** `/api/v1/profiles`

Create a new profile draft for the authenticated user.

**Request:**
```json
{
  "displayName": "John Doe",
  "headline": "Software Engineer from NYC",
  "about": "I am a passionate developer looking for a life partner..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "profile-uuid",
    "userId": "user-uuid",
    "displayName": "John Doe",
    "headline": "Software Engineer from NYC",
    "about": "I am a passionate developer...",
    "published": false,
    "completeness": 25,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  },
  "message": "Profile created successfully"
}
```

---

### 2. Get My Profile

**GET** `/api/v1/profiles/me`

Retrieve the authenticated user's profile (draft or published).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "profile-uuid",
    "userId": "user-uuid",
    "displayName": "John Doe",
    "completeness": 75,
    "published": false,
    "photos": [...],
    "preferences": {...}
  }
}
```

---

### 3. Get Profile by ID

**GET** `/api/v1/profiles/:id`

Retrieve a profile by ID. **Profile masking applied** based on viewer permissions.

**Masking Rules:**
- **Owner**: Sees all fields
- **Premium/Guardian**: Sees all public + some private fields
- **Regular Visitor**: Sees only public fields, truncated about, public photos only

**Response (Masked):**
```json
{
  "success": true,
  "data": {
    "id": "profile-uuid",
    "displayName": "John Doe",
    "headline": "Software Engineer from NYC",
    "about": "I am a passionate developer...",  // Truncated to 150 chars for visitors
    "gender": "male",
    "age": 28,
    "location": {
      "city": "New York",
      "state": "NY",
      "country": "USA"
      // Coordinates removed for privacy
    },
    "completeness": 85,
    "photos": [
      // Only public photos shown
    ]
  }
}
```

---

### 4. Update Profile Step

**PATCH** `/api/v1/profiles/:id/step`

Update a specific step in the profile wizard.

#### Available Steps:

1. **about** - Update about and headline
2. **demographics** - Update gender and date of birth
3. **family** - Update family details
4. **lifestyle** - Update lifestyle preferences
5. **location** - Update location information
6. **photos-metadata** - Link photo metadata
7. **preferences** - Update partner preferences

#### Example: Update About Step

**Request:**
```json
{
  "step": "about",
  "data": {
    "about": "I am a software engineer with 5+ years of experience...",
    "headline": "Tech Professional seeking Life Partner"
  }
}
```

#### Example: Update Demographics Step

**Request:**
```json
{
  "step": "demographics",
  "data": {
    "gender": "male",
    "dob": "1995-03-15"
  }
}
```

#### Example: Update Location Step

**Request:**
```json
{
  "step": "location",
  "data": {
    "location": {
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "coordinates": {
        "lat": 40.7128,
        "lng": -74.0060
      }
    }
  }
}
```

#### Example: Update Photos Metadata Step

**Request:**
```json
{
  "step": "photos-metadata",
  "data": {
    "photos": [
      {
        "objectKey": "user-123/photo-1.jpg",
        "url": "https://cdn.biye.com/photos/photo-1.jpg",
        "fileSize": 204800,
        "privacyLevel": "public"
      },
      {
        "objectKey": "user-123/photo-2.jpg",
        "url": "https://cdn.biye.com/photos/photo-2.jpg",
        "fileSize": 153600,
        "privacyLevel": "private"
      }
    ]
  }
}
```

#### Example: Update Preferences Step

**Request:**
```json
{
  "step": "preferences",
  "data": {
    "preferences": {
      "basic": {
        "ageRange": { "min": 25, "max": 35 },
        "heightRange": { "min": 160, "max": 180 },
        "maritalStatus": ["never_married", "divorced"]
      },
      "lifestyle": {
        "diet": ["vegetarian", "vegan"],
        "drinking": ["never"],
        "smoking": ["never"]
      },
      "education": {
        "minEducation": "bachelors",
        "fieldOfStudy": ["engineering", "business"]
      },
      "location": {
        "cities": ["New York", "Boston", "San Francisco"],
        "countries": ["USA", "Canada"],
        "willingToRelocate": true
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "profile-uuid",
    "completeness": 80,  // Updated based on new data
    ...
  },
  "message": "Profile step updated successfully"
}
```

---

### 5. Publish Profile

**POST** `/api/v1/profiles/:id/publish`

Publish the profile (makes it visible to others).

**Required Fields for Publishing:**
- ✅ displayName (min 2 chars)
- ✅ gender
- ✅ dob (age 18-100)
- ✅ location (city, state, country)
- ✅ about (min 50 chars)
- ✅ headline (min 10 chars)
- ✅ At least 1 photo

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "profile-uuid",
    "published": true,
    "completeness": 90
  },
  "message": "Profile published successfully"
}
```

**Error Response (Incomplete):**
```json
{
  "success": false,
  "error": {
    "message": "Profile cannot be published. Missing required fields: gender, dob, photos (at least 1 required)"
  }
}
```

---

### 6. Unpublish Profile

**POST** `/api/v1/profiles/:id/unpublish`

Unpublish the profile (hides it from others).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "profile-uuid",
    "published": false
  },
  "message": "Profile unpublished successfully"
}
```

---

### 7. Delete Profile

**DELETE** `/api/v1/profiles/:id`

Soft delete the profile (owner only).

**Response:**
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

---

## Completeness Calculation

The completeness score (0-100%) is calculated based on weighted sections:

| Section | Weight | Criteria |
|---------|--------|----------|
| Display Name | 10% | Length >= 2 chars |
| Headline | 10% | Length >= 10 chars |
| About | 15% | Length >= 50 chars |
| Gender | 10% | Not null |
| Date of Birth | 10% | Not null, age 18-100 |
| Location | 15% | Valid city, state, country |
| Photos | 20% | At least 1 photo |
| Preferences | 10% | Not null |

**Total:** 100%

**Example:**
- Profile with displayName, gender, dob, and 1 photo = 50% complete
- Profile with all fields = 100% complete

---

## Profile Masking & Privacy

### Visibility Levels:

#### 1. **Owner** (userId matches profile.userId)
- ✅ Full access to all fields
- ✅ Can see unpublished profiles
- ✅ Can see private photos
- ✅ Can see complete about section
- ✅ Can see exact location coordinates

#### 2. **Guardian/Premium User**
- ✅ Can see published profiles only
- ✅ Can see all public photos
- ✅ Can see complete about section
- ✅ Can see location (city/state/country, no coordinates)
- ✅ Can see partner preferences

#### 3. **Regular Visitor**
- ✅ Can see published profiles only
- ✅ Can see public photos only
- ✅ About section truncated to 150 characters
- ✅ Location limited to city/state/country (no coordinates)
- ❌ Cannot see private photos
- ❌ Cannot see "on_request" photos

### Photo Privacy Levels:

- **public**: Visible to all visitors
- **private**: Visible to owner and guardians only
- **on_request**: Visible after connection request accepted

---

## Validation Rules

### Registration Validation:
- `displayName`: Min 2 characters
- `headline`: Min 10 characters (optional at creation)
- `about`: Min 50 characters (optional at creation)

### Demographics Validation:
- `gender`: Must be "male", "female", or "other"
- `dob`: Age must be 18-100 years

### Location Validation:
- `city`: Min 2 characters
- `state`: Min 2 characters
- `country`: Min 2 characters

### Photos Validation:
- `url`: Must be valid URL
- `fileSize`: Must be positive integer
- `privacyLevel`: Must be "public", "private", or "on_request"

---

## Security & Permissions

### Authorization Checks:

1. **Profile Creation**: Authenticated users only
2. **Profile Viewing**: 
   - Owner: Can view draft or published
   - Others: Can only view published profiles
3. **Profile Editing**: Owner only
4. **Profile Publishing**: Owner only
5. **Profile Deletion**: Owner only

### Access Control:

```typescript
// Example permission check
const canView = profilePermissions.canViewProfile(profile, requester);
if (!canView) {
  throw new Error('You do not have permission to view this profile');
}
```

---

## Usage Examples

### Complete Profile Wizard Flow:

```javascript
// 1. Create profile
POST /api/v1/profiles
{
  "displayName": "Jane Smith"
}

// 2. Update about
PATCH /api/v1/profiles/{id}/step
{
  "step": "about",
  "data": {
    "about": "I am a teacher with a passion for education and lifelong learning...",
    "headline": "Educator seeking meaningful connection"
  }
}

// 3. Update demographics
PATCH /api/v1/profiles/{id}/step
{
  "step": "demographics",
  "data": {
    "gender": "female",
    "dob": "1992-07-20"
  }
}

// 4. Update location
PATCH /api/v1/profiles/{id}/step
{
  "step": "location",
  "data": {
    "location": {
      "city": "Boston",
      "state": "MA",
      "country": "USA"
    }
  }
}

// 5. Add photos
PATCH /api/v1/profiles/{id}/step
{
  "step": "photos-metadata",
  "data": {
    "photos": [
      {
        "objectKey": "user-456/profile.jpg",
        "url": "https://cdn.biye.com/photos/profile.jpg",
        "fileSize": 256000,
        "privacyLevel": "public"
      }
    ]
  }
}

// 6. Publish profile
POST /api/v1/profiles/{id}/publish
```

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Common Error Codes:
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Profile not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `CONFLICT`: Profile already exists

---

## Testing

Unit tests are provided in `profile.test.ts` (run locally):

```bash
npm test src/modules/profile/profile.test.ts
```

**Test Coverage:**
- ✅ Profile creation
- ✅ Step updates
- ✅ Publish validation
- ✅ Completeness calculation
- ✅ Profile masking
- ✅ Permission checks

---

## Migration Commands

Run these commands locally:

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_profile_models

# Apply migration
npx prisma migrate deploy
```

---

## OpenAPI Documentation

Full OpenAPI spec available in `openapi-profile.yaml`.

View with Swagger UI:
```bash
# Install swagger-ui-express
npm install swagger-ui-express

# Serve at /api-docs
```

---

## Next Steps

1. **Photo Upload Integration** - Implement actual photo upload to object storage
2. **Search & Filtering** - Add profile search with preference matching
3. **Matching Algorithm** - Implement compatibility scoring
4. **Guardian System** - Add guardian account linking
5. **Premium Features** - Implement premium user benefits
6. **Notifications** - Profile view notifications
7. **Analytics** - Track profile completeness and engagement
