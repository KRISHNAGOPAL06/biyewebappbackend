# Biye Matrimonial Platform - Backend API

A secure, production-ready backend API scaffold for the Biye-style matrimonial platform. Built with Node.js, Express, TypeScript, Prisma, and comprehensive security middleware.

## 🏗️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis (ioredis client)
- **Validation**: Zod
- **Logging**: Winston
- **Testing**: Jest + SuperTest
- **Security**: Helmet, CORS, Rate Limiting
- **Code Quality**: ESLint + Prettier

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── env.ts                 # Environment validation with Zod
│   ├── utils/
│   │   ├── logger.ts              # Winston logger with requestId
│   │   ├── response.ts            # Standardized API responses
│   │   └── idempotency.ts         # Idempotency helper stub
│   ├── middleware/
│   │   ├── helmet.ts              # Security headers
│   │   ├── rateLimit.ts           # Rate limiting (100 req/15min)
│   │   ├── cors.ts                # CORS configuration
│   │   ├── requestId.ts           # Request ID tracking
│   │   ├── errorHandler.ts        # Centralized error handling
│   │   ├── authMiddleware.ts      # JWT authentication
│   │   └── validate.ts            # Request validation wrapper
│   ├── routes/
│   │   └── health.route.ts        # Health check endpoint
│   ├── __tests__/
│   │   └── health.test.ts         # Health endpoint tests
│   ├── index.ts                   # Express app (exported for testing)
│   └── server.ts                  # Development server runner
├── prisma/
│   └── schema.prisma              # Prisma schema with User model
├── jest.config.js                 # Jest configuration
├── .eslintrc.json                 # ESLint configuration
├── .prettierrc.json               # Prettier configuration
├── .env.example                   # Environment variables template
└── README.md                      # This file
```

## 🚀 Getting Started

### Prerequisites

You need to have the following running **locally** (not in Replit):

- **PostgreSQL** database
- **Redis** server

> **Note**: This scaffold is designed for local database setup. Docker Compose or native installation of PostgreSQL and Redis must be run on your local machine.

### Installation

1. **Clone the repository** and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure your environment variables:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/biye_db
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   PORT=3000
   LOG_LEVEL=info
   ALLOWED_ORIGINS=http://localhost:3000
   ```

4. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

5. **Run database migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

### Development

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run linting:

```bash
npm run lint
```

Format code:

```bash
npm run format
```

## 📡 API Endpoints

### Health Check

**GET** `/api/health`

Returns the API health status, uptime, and timestamp.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": "123s",
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

## 🔒 Security Features

- **Helmet**: Security headers (CSP, HSTS, XSS protection, etc.)
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: 100 requests per 15 minutes (configurable)
- **Request ID**: Unique ID tracking for each request
- **JWT Authentication**: Token-based authentication middleware
- **Input Validation**: Zod schema validation for all requests
- **Error Handling**: Centralized error handling with structured responses

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `REDIS_URL` | Redis connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT (min 32 chars) | Yes | - |
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `3000` |
| `LOG_LEVEL` | Winston log level | No | `info` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Yes | - |

## 🧪 Testing

The project uses Jest and SuperTest for testing. Tests are located in `src/__tests__/`.

Example test structure:
```typescript
import request from 'supertest';
import { createApp } from '../index.js';

describe('API Route', () => {
  const app = createApp();
  
  it('should return expected response', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);
    
    expect(response.body).toMatchObject({
      success: true,
      data: expect.any(Object),
    });
  });
});
```

## 📦 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## 🏗️ Architecture Decisions

### Separation of Concerns

- **index.ts**: Exports the Express app for testing
- **server.ts**: Only used for development (`npm run dev`)
- Production deployment uses the built app from `index.ts`

### Error Handling

All errors are caught by the centralized error handler which:
- Logs errors with request context
- Returns structured error responses
- Handles Zod validation errors
- Prevents sensitive data leakage in production

### Logging

Winston logger with JSON format for production:
- Request ID correlation
- Structured logging for easy parsing
- Different log levels for development vs production
- Request/response logging with duration

### Response Format

All API responses follow a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

## 🔄 Database Migrations

Using Prisma for database migrations:

Create a new migration:
```bash
npx prisma migrate dev --name migration_name
```

Apply migrations in production:
```bash
npx prisma migrate deploy
```

Reset database (development only):
```bash
npx prisma migrate reset
```

## 🚧 Next Steps

This scaffold provides the foundation. To build your matrimonial platform:

1. Add user registration and login endpoints
2. Implement profile management
3. Add search and matching functionality
4. Implement messaging system
5. Add payment integration
6. Set up email notifications
7. Implement admin panel
8. Add comprehensive API documentation (Swagger/OpenAPI)

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests and linting
4. Commit your changes
5. Push to the branch
6. Create a Pull Request

---

**Important**: This is an API-only backend. Do not run database migrations or start Redis/PostgreSQL in Replit. All database operations must be performed locally.
#   b i y e w e b a p p b a c k e n d  
 #   b i y e w e b a p p b a c k e n d  
 