# Biye Matrimonial Platform - Backend API

## Overview

A secure, production-ready backend API for a matrimonial platform facilitating user and profile management. It includes advanced authentication, comprehensive profile management with a draft/publish workflow, completeness tracking, and privacy controls. The platform aims to provide a robust foundation for matrimonial services, including real-time chat, notifications, and a flexible subscription system for feature access.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technology Stack

The platform is built with Node.js 18+ using Express.js and TypeScript. It leverages PostgreSQL via Prisma ORM for persistent data storage and Redis for caching, session management, and refresh token storage. ES Modules are used for modern JavaScript features.

### Authentication Architecture

The system employs OTP-based email authentication for both registration and login, utilizing 6-digit numeric OTPs with a 5-minute expiry. OTPs are securely stored using bcrypt. Token management involves JWT access tokens (15-minute expiry) and rotating refresh tokens stored in Redis (7-day expiry), with refresh token rotation on every request and token reuse detection for enhanced security. Session tracking includes device ID, IP, user agent, and supports session revocation.

### Security Architecture

Security is enforced with Helmet for HTTP headers, CORS with origin whitelist, and comprehensive rate limiting on all endpoints, especially authentication. Request IDs are used for tracing. All request data is validated using Zod schemas, and a centralized error handler provides consistent JSON error responses. Cookie security (HttpOnly, Secure, SameSite=strict) is also implemented.

### API Architecture

API routes are organized modularly (e.g., `/api/v1/auth`, `/api/v1/profiles`, `/api/v1/chats`, `/api/v1/payments`, `/api/v1/notifications`). A standardized JSON response format is used for both success and error states. The middleware pipeline includes request ID assignment, logging, security headers, CORS, rate limiting, body parsing, and cookie parsing, leading to route handlers and a centralized error handling mechanism.

### Service Layer Architecture

Key services include:
- **Authentication Service:** Handles user registration, OTP verification, login, token refresh, and logout.
- **Token Service:** Manages JWT and refresh token generation, verification, and rotation.
- **Session Service:** Provides CRUD operations for user sessions and activity tracking.
- **Email Service:** Integrates Nodemailer for OTP and welcome email delivery with HTML templates.
- **Profile Service:** Manages profile creation, step-by-step updates, publishing, and retrieval with privacy masking.
- **Completeness Service:** Calculates dynamic profile completeness and validates publish readiness.
- **Profile Permissions:** Implements field-level masking based on user roles (Owner, Guardian, Premium, Visitor).
- **Chat Service:** Manages chat threads, real-time message persistence, pagination, read receipts, and profanity filtering.
- **Notification Service:** An event-driven system for in-app, email, and push notifications with user preferences.
- **Payment & Entitlement Service:** Manages subscription plans, profile-based subscriptions, and checks feature entitlements, supporting multiple payment gateways.

### Logging & Monitoring

Winston is used for structured JSON logging in production and colorized console output in development, supporting various log levels and request correlation via request IDs.

### Testing Strategy

Jest is configured with `ts-jest` for unit testing, covering `src/**/*.ts` files. `Supertest` is used for HTTP assertion testing.

## External Dependencies

### Required Services

- **PostgreSQL Database:** Managed via Prisma ORM, storing User, Session, Profile, Photo, Preference, Thread, Message, Notification, NotificationPreference, Plan, Subscription, and Payment models.
- **Redis Cache:** Used for refresh token storage, OTP rate limiting, and token reuse detection, connected via `ioredis`.

### Third-Party NPM Packages

**Production Dependencies:**
- `express`, `@prisma/client`, `ioredis`, `jsonwebtoken`, `bcryptjs`, `zod`, `helmet`, `cors`, `express-rate-limit`, `cookie-parser`, `winston`, `dotenv`, `socket.io`, `socket.io-client`.

**Development Dependencies:**
- `typescript`, `tsx`, `@typescript-eslint/*`, `jest`, `ts-jest`, `supertest`, `prettier`, `eslint`.

### Environment Variables

Critical environment variables for configuration include: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `NODE_ENV`, `PORT`, `LOG_LEVEL`, and `ALLOWED_ORIGINS`.

### Future Integration Points

- **Email Service Provider:** Utilizes Nodemailer for SMTP email delivery, configurable via environment variables, and supporting HTML templates.
- **Real-time Messaging (Socket.IO):** Integrated for real-time chat with JWT authentication, per-user rooms, rate limiting, and XSS prevention.
- **OpenAPI Documentation:** Comprehensive API documentation for authentication, profile, chat, notifications, and payments is planned.
- **Payment Gateways:** Stubs for SSLCommerz, Stripe, bKash, and Apple Pay are in place, awaiting full integration.