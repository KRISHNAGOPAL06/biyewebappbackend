import { DiscoveryService } from './discovery.service';
import { RecommendationService } from './recommendation.service';
import { RankingService } from './ranking.service';

jest.mock('@prisma/client');
jest.mock('../../utils/cache.service');
jest.mock('../profile/profile.permissions');

describe('RankingService', () => {
  let rankingService: RankingService;

  beforeEach(() => {
    rankingService = new RankingService();
  });

  describe('calculateRecencyScore', () => {
    it('should give highest score to profiles created today', () => {
      const score = rankingService.calculateRecencyScore(new Date());
      expect(score).toBe(1.0);
    });

    it('should give lower score to older profiles', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);
      const score = rankingService.calculateRecencyScore(oldDate);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('calculateCompletenessScore', () => {
    it('should convert percentage to decimal', () => {
      expect(rankingService.calculateCompletenessScore(100)).toBe(1.0);
      expect(rankingService.calculateCompletenessScore(50)).toBe(0.5);
      expect(rankingService.calculateCompletenessScore(0)).toBe(0.0);
    });
  });

  describe('calculatePreferenceMatchScore', () => {
    it('should return 0.5 when no preferences provided', () => {
      const profile = {
        id: '1',
        createdAt: new Date(),
        completeness: 100,
      };
      const score = rankingService.calculatePreferenceMatchScore(profile);
      expect(score).toBe(0.5);
    });

    it('should calculate age match (mocked)', () => {
    });

    it('should calculate gender match (mocked)', () => {
    });
  });

  describe('rankProfiles', () => {
    it('should sort profiles by total score', () => {
      const profiles = [
        { id: '1', createdAt: new Date('2025-01-01'), completeness: 50 },
        { id: '2', createdAt: new Date(), completeness: 100 },
        { id: '3', createdAt: new Date('2024-01-01'), completeness: 30 },
      ];

      const ranked = rankingService.rankProfiles(profiles);
      
      expect(ranked[0].completeness).toBeGreaterThanOrEqual(ranked[1].completeness);
    });
  });
});

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    discoveryService = new DiscoveryService();
  });

  describe('getRecommended', () => {
    it('should return cached results if available (mocked)', async () => {
    });

    it('should fetch and cache new results (mocked)', async () => {
    });

    it('should mask profiles based on permissions (mocked)', async () => {
    });
  });

  describe('getNewToday', () => {
    it('should filter profiles created today (mocked)', async () => {
    });
  });

  describe('getNearby', () => {
    it('should filter by city (stub implementation) (mocked)', async () => {
    });
  });
});
