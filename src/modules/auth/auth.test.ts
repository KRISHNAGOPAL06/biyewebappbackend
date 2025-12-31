import request from 'supertest';
import { createApp } from '../../index.js';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../config/redis.js';

const app = createApp();
const prisma = new PrismaClient();

describe('Auth Module', () => {
  const testEmail = 'test@example.com';
  const testFullName = 'Test User';

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await prisma.$disconnect();
    await redis.quit();
  });

  // describe('POST /api/v1/auth/register', () => {
  //   it('should register a new user and send OTP', async () => {
  //     const response = await request(app)
  //       .post('/api/v1/auth/register')
  //       .send({
  //         email: testEmail,
  //         fullName: testFullName,
  //       })
  //       .expect(201);

  //     expect(response.body).toMatchObject({
  //       success: true,
  //       data: {
  //         success: true,
  //       },
  //     });

  //     const user = await prisma.user.findUnique({
  //       where: { email: testEmail },
  //     });

  //     expect(user).toBeDefined();
  //     expect(user?.email).toBe(testEmail);
  //     expect(user?.fullName).toBe(testFullName);
  //     expect(user?.isVerified).toBe(false);
  //     expect(user?.otpHash).toBeDefined();
  //     expect(user?.otpExpiry).toBeDefined();
  //   });

  //   it('should resend OTP for unverified user', async () => {
  //     const response = await request(app)
  //       .post('/api/v1/auth/register')
  //       .send({
  //         email: testEmail,
  //         fullName: testFullName,
  //       })
  //       .expect(201);

  //     expect(response.body.success).toBe(true);
  //   });

  //   it('should reject invalid email', async () => {
  //     const response = await request(app)
  //       .post('/api/v1/auth/register')
  //       .send({
  //         email: 'invalid-email',
  //         fullName: testFullName,
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //   });
  // });

  // describe('POST /api/v1/auth/verify', () => {
  //   it('should reject invalid OTP', async () => {
  //     const response = await request(app)
  //       .post('/api/v1/auth/verify')
  //       .send({
  //         email: testEmail,
  //         otp: '000000',
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //   });

  //   it('should reject expired OTP', async () => {
  //     await prisma.user.update({
  //       where: { email: testEmail },
  //       data: {
  //         otpExpiry: new Date(Date.now() - 10 * 60 * 1000),
  //       },
  //     });

  //     const response = await request(app)
  //       .post('/api/v1/auth/verify')
  //       .send({
  //         email: testEmail,
  //         otp: '123456',
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //   });
  // });

  // describe('POST /api/v1/auth/login', () => {
  //   it('should reject login for non-existent user', async () => {
  //     const response = await request(app)
  //       .post('/api/v1/auth/login')
  //       .send({
  //         email: 'nonexistent@example.com',
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //   });

  //   it('should reject login for unverified user', async () => {
  //     const response = await request(app)
  //       .post('/api/v1/auth/login')
  //       .send({
  //         email: testEmail,
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //   });
  // });

  // describe('POST /api/v1/auth/refresh', () => {
  //   it('should reject refresh with no token', async () => {
  //     const response = await request(app).post('/api/v1/auth/refresh').expect(400);

  //     expect(response.body.success).toBe(false);
  //   });

  //   it('should reject refresh with invalid token', async () => {
  //     const response = await request(app)
  //       .post('/api/v1/auth/refresh')
  //       .set('Cookie', ['refreshToken=invalid-token'])
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //   });
  // });

  // describe('GET /api/v1/auth/me', () => {
  //   it('should reject unauthorized request', async () => {
  //     const response = await request(app).get('/api/v1/auth/me').expect(401);

  //     expect(response.body.success).toBe(false);
  //   });

  //   it('should reject request with invalid token', async () => {
  //     const response = await request(app)
  //       .get('/api/v1/auth/me')
  //       .set('Authorization', 'Bearer invalid-token')
  //       .expect(401);

  //     expect(response.body.success).toBe(false);
  //   });
  // });

  // describe('POST /api/v1/auth/logout', () => {
  //   it('should reject unauthorized logout request', async () => {
  //     const response = await request(app).post('/api/v1/auth/logout').expect(401);

  //     expect(response.body.success).toBe(false);
  //   });
  // });

  // describe('Rate Limiting', () => {
  //   it('should enforce OTP rate limits', async () => {
  //     const requests = [];

  //     for (let i = 0; i < 6; i++) {
  //       requests.push(
  //         request(app)
  //           .post('/api/v1/auth/register')
  //           .send({
  //             email: `ratelimit${i}@example.com`,
  //             fullName: 'Rate Limit Test',
  //           })
  //       );
  //     }

  //     const responses = await Promise.all(requests);
  //     const rateLimitedResponse = responses[responses.length - 1];

  //     expect(rateLimitedResponse.status).toBe(429);
  //   }, 10000);
  // });
});
