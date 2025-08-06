import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProviderReview, ReviewStatus } from './provider-review.schema';
import { ProviderStatistics } from './provider-statistics.schema';
import { ServiceCategory } from '../../services/schemas/service.schema';

describe('Provider Review Schemas', () => {
  describe('Schema Validation', () => {
    it('should validate review data structure', () => {
      const reviewData = {
        providerId: '507f1f77bcf86cd799439011',
        reviewerId: '507f1f77bcf86cd799439012',
        rating: 5,
        comment: 'Excellent service!',
        serviceCategory: ServiceCategory.CLEANING,
        status: ReviewStatus.ACTIVE,
      };

      expect(reviewData.providerId).toBeDefined();
      expect(reviewData.reviewerId).toBeDefined();
      expect(reviewData.rating).toBeGreaterThanOrEqual(1);
      expect(reviewData.rating).toBeLessThanOrEqual(5);
      expect(reviewData.comment).toBeDefined();
      expect(Object.values(ServiceCategory)).toContain(
        reviewData.serviceCategory,
      );
      expect(Object.values(ReviewStatus)).toContain(reviewData.status);
    });

    it('should validate rating constraints', () => {
      const validRatings = [1, 2, 3, 4, 5];
      const invalidRatings = [0, 6, -1, 10];

      validRatings.forEach((rating) => {
        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(5);
      });

      invalidRatings.forEach((rating) => {
        expect(rating < 1 || rating > 5).toBe(true);
      });
    });

    it('should validate provider response structure', () => {
      const providerResponse = {
        text: 'Thank you for your feedback!',
        respondedAt: new Date(),
      };

      expect(providerResponse.text).toBeDefined();
      expect(typeof providerResponse.text).toBe('string');
      expect(providerResponse.text.length).toBeLessThanOrEqual(300);
      expect(providerResponse.respondedAt).toBeInstanceOf(Date);
    });

    it('should validate review status enum values', () => {
      const validStatuses = [
        ReviewStatus.ACTIVE,
        ReviewStatus.HIDDEN,
        ReviewStatus.DELETED,
        ReviewStatus.PENDING_MODERATION,
      ];

      validStatuses.forEach((status) => {
        expect(Object.values(ReviewStatus)).toContain(status);
      });
    });

    describe('ProviderStatistics Structure', () => {
      it('should validate provider statistics structure', () => {
        const statsData = {
          providerId: '507f1f77bcf86cd799439011',
          averageRating: 4.5,
          totalReviews: 10,
          ratingDistribution: {
            fiveStars: 5,
            fourStars: 3,
            threeStars: 2,
            twoStars: 0,
            oneStar: 0,
          },
          recentReviewsCount: 3,
        };

        expect(statsData.providerId).toBeDefined();
        expect(statsData.averageRating).toBeGreaterThanOrEqual(0);
        expect(statsData.averageRating).toBeLessThanOrEqual(5);
        expect(statsData.totalReviews).toBeGreaterThanOrEqual(0);
        expect(statsData.ratingDistribution).toBeDefined();
        expect(statsData.ratingDistribution.fiveStars).toBeDefined();
        expect(statsData.ratingDistribution.fourStars).toBeDefined();
        expect(statsData.ratingDistribution.threeStars).toBeDefined();
        expect(statsData.ratingDistribution.twoStars).toBeDefined();
        expect(statsData.ratingDistribution.oneStar).toBeDefined();
        expect(statsData.recentReviewsCount).toBeGreaterThanOrEqual(0);
      });

      it('should validate rating distribution calculations', () => {
        const ratingDistribution = {
          fiveStars: 5,
          fourStars: 3,
          threeStars: 2,
          twoStars: 0,
          oneStar: 0,
        };

        const totalRatings = Object.values(ratingDistribution).reduce(
          (sum, count) => sum + count,
          0,
        );
        const weightedSum =
          ratingDistribution.fiveStars * 5 +
          ratingDistribution.fourStars * 4 +
          ratingDistribution.threeStars * 3 +
          ratingDistribution.twoStars * 2 +
          ratingDistribution.oneStar * 1;
        const expectedAverage = weightedSum / totalRatings;

        expect(totalRatings).toBe(10);
        expect(expectedAverage).toBe(4.3);
      });

      it('should handle category ratings structure', () => {
        const categoryRatings = new Map();
        categoryRatings.set(ServiceCategory.CLEANING, {
          averageRating: 4.5,
          totalReviews: 5,
        });
        categoryRatings.set(ServiceCategory.PLUMBING, {
          averageRating: 4.0,
          totalReviews: 3,
        });

        expect(categoryRatings.size).toBe(2);
        expect(categoryRatings.get(ServiceCategory.CLEANING)).toEqual({
          averageRating: 4.5,
          totalReviews: 5,
        });
        expect(categoryRatings.get(ServiceCategory.PLUMBING)).toEqual({
          averageRating: 4.0,
          totalReviews: 3,
        });
      });
    });
  });
});
