import request from 'supertest';
import { createApp } from '../app';

describe('API Integration Tests', () => {
  const app = createApp();

  describe('GET /api/health', () => {
    it('should return 200 with health status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('cache');
      expect(response.body.services).toHaveProperty('mlService');
    });
  });

  describe('GET /api/constants', () => {
    it('should return application constants', async () => {
      const response = await request(app).get('/api/constants').expect(200);

      expect(response.body).toHaveProperty('minDatasetSize');
      expect(response.body).toHaveProperty('recommendedDatasetSize');
      expect(response.body).toHaveProperty('maxDisplayDatasetSize');
      expect(response.body).toHaveProperty('defaultPageSize');
      expect(response.body).toHaveProperty('redBallRange');
      expect(response.body).toHaveProperty('blueBallRange');
      expect(response.body).toHaveProperty('fileUploadLimitMb');
      expect(response.body).toHaveProperty('predictionTimeoutSeconds');
      expect(response.body).toHaveProperty('apiResponseTimeoutSeconds');
    });

    it('should return valid ball ranges', async () => {
      const response = await request(app).get('/api/constants').expect(200);

      expect(response.body.redBallRange).toEqual({
        min: 1,
        max: 33,
        picks: 6,
      });
      expect(response.body.blueBallRange).toEqual({
        min: 1,
        max: 16,
        picks: 1,
      });
    });
  });

  describe('404 Not Found Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route').expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 1001);
      expect(response.body.error.message).toMatch(/未找到|not found/i);
    });

    it('should return 404 for non-api routes', async () => {
      await request(app).get('/unknown-route').expect(404);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // Send 5 requests quickly
      const promises = Array.from({ length: 5 }, () => request(app).get('/api/health'));
      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app).get('/api/health').expect(200);

      // CORS middleware is enabled, check for credentials header
      expect(response.headers).toHaveProperty('access-control-allow-credentials');
    });
  });

  describe('Security Headers', () => {
    it('should include helmet security headers', async () => {
      const response = await request(app).get('/api/health').expect(200);

      // Check for some key helmet headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});
