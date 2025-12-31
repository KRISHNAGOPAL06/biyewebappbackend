import request from 'supertest';
import { createApp } from '../index.js';

jest.mock('../config/env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret-key-minimum-32-characters-long',
    NODE_ENV: 'test' as const,
    PORT: 3000,
    LOG_LEVEL: 'error' as const,
    ALLOWED_ORIGINS: ['http://localhost:3000'],
  },
}));

describe('Health Route', () => {
  const app = createApp();

  describe('GET /api/health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'ok',
        },
      });

      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.uptime).toMatch(/\d+s/);
    });

    it('should include X-Request-Id header', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers['x-request-id']).toBeTruthy();
    });

    it('should accept custom X-Request-Id', async () => {
      const customRequestId = 'custom-request-id-12345';
      const response = await request(app)
        .get('/api/health')
        .set('X-Request-Id', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customRequestId);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Route not found',
          code: 'NOT_FOUND',
        },
      });
    });
  });
});
