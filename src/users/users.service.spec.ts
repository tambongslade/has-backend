import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User, UserRole } from './schemas/user.schema';
import { Service } from '../services/schemas/service.schema';
import { Availability } from '../bookings/schemas/availability.schema';
import { ProviderReview } from './schemas/provider-review.schema';
import { ProviderStatistics } from './schemas/provider-statistics.schema';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('UsersService - Provider Reviews', () => {
  let service: UsersService;
  let mockUserModel: any;
  let mockProviderReviewModel: any;
  let mockProviderStatisticsModel: any;

  const mockUser = {
    _id: 'providerId123',
    role: UserRole.PROVIDER,
    fullName: 'John Doe',
    email: 'john@example.com',
  };

  const mockReview = {
    _id: 'reviewId123',
    providerId: 'providerId123',
    reviewerId: 'reviewerId123',
    rating: 5,
    comment: 'Great service!',
    status: 'active',
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    const mockUserModelValue = {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
      exec: jest.fn(),
    };

    const mockProviderReviewModelValue = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      populate: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      exec: jest.fn(),
    };

    const mockProviderStatisticsModelValue = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModelValue,
        },
        {
          provide: getModelToken(Service.name),
          useValue: {},
        },
        {
          provide: getModelToken(Availability.name),
          useValue: {},
        },
        {
          provide: getModelToken(ProviderReview.name),
          useValue: function (reviewData: any) {
            return {
              ...mockReview,
              ...reviewData,
              save: jest
                .fn()
                .mockResolvedValue({ ...mockReview, ...reviewData }),
            };
          },
        },
        {
          provide: getModelToken(ProviderStatistics.name),
          useValue: mockProviderStatisticsModelValue,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    mockUserModel = module.get(getModelToken(User.name));
    mockProviderReviewModel = module.get(getModelToken(ProviderReview.name));
    mockProviderStatisticsModel = module.get(
      getModelToken(ProviderStatistics.name),
    );
  });

  describe('addProviderReview', () => {
    it('should successfully add a review', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      // Mock the statistics update
      jest
        .spyOn(service as any, 'updateProviderStatistics')
        .mockResolvedValue(undefined);

      const createReviewDto = {
        rating: 5,
        comment: 'Excellent service!',
        serviceCategory: 'cleaning' as any,
      };

      const result = await service.addProviderReview(
        'providerId123',
        createReviewDto,
        'reviewerId123',
      );

      expect(result).toHaveProperty('review');
      expect(result).toHaveProperty('message', 'Review added successfully');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        _id: 'providerId123',
        role: UserRole.PROVIDER,
      });
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const createReviewDto = {
        rating: 5,
        comment: 'Great service!',
      };

      await expect(
        service.addProviderReview(
          'nonexistentId',
          createReviewDto,
          'reviewerId123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to review yourself', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const createReviewDto = {
        rating: 5,
        comment: 'Great service!',
      };

      await expect(
        service.addProviderReview(
          'providerId123',
          createReviewDto,
          'providerId123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate review', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      // Mock constructor to throw duplicate key error
      const mockProviderReviewConstructor = jest
        .fn()
        .mockImplementation(() => ({
          save: jest.fn().mockRejectedValue({ code: 11000 }),
        }));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: getModelToken(User.name),
            useValue: mockUserModel,
          },
          {
            provide: getModelToken(Service.name),
            useValue: {},
          },
          {
            provide: getModelToken(Availability.name),
            useValue: {},
          },
          {
            provide: getModelToken(ProviderReview.name),
            useValue: mockProviderReviewConstructor,
          },
          {
            provide: getModelToken(ProviderStatistics.name),
            useValue: mockProviderStatisticsModel,
          },
        ],
      }).compile();

      const testService = module.get<UsersService>(UsersService);

      const createReviewDto = {
        rating: 5,
        comment: 'Great service!',
      };

      await expect(
        testService.addProviderReview(
          'providerId123',
          createReviewDto,
          'reviewerId123',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getProviderReviews', () => {
    it('should return provider reviews with pagination', async () => {
      const mockReviews = [mockReview];
      const mockTotal = 1;
      const mockStatistics = {
        averageRating: 4.5,
        totalReviews: 10,
        ratingDistribution: { 5: 5, 4: 3, 3: 2, 2: 0, 1: 0 },
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockProviderReviewModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  exec: jest.fn().mockResolvedValue(mockReviews),
                }),
              }),
            }),
          }),
        }),
      });

      mockProviderReviewModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTotal),
      });

      jest
        .spyOn(service as any, 'getProviderReviewStatistics')
        .mockResolvedValue(mockStatistics);

      const result = await service.getProviderReviews('providerId123', 0, 10);

      expect(result).toHaveProperty('reviews', mockReviews);
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('statistics', mockStatistics);
      expect(result.pagination.total).toBe(mockTotal);
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getProviderReviews('nonexistentId', 0, 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addProviderResponse', () => {
    it('should successfully add a provider response', async () => {
      const mockReviewWithResponse = {
        ...mockReview,
        providerResponse: {
          text: 'Thank you for your feedback!',
          respondedAt: new Date(),
        },
      };

      mockProviderReviewModel.findById.mockResolvedValue(mockReview);
      mockProviderReviewModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockReviewWithResponse),
        }),
      });

      const result = await service.addProviderResponse(
        'reviewId123',
        'Thank you for your feedback!',
        'providerId123',
      );

      expect(result).toHaveProperty('review');
      expect(result).toHaveProperty('message', 'Response added successfully');
      expect(mockProviderReviewModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw NotFoundException when review does not exist', async () => {
      mockProviderReviewModel.findById.mockResolvedValue(null);

      await expect(
        service.addProviderResponse(
          'nonexistentId',
          'Response',
          'providerId123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when provider tries to respond to another provider's review", async () => {
      const otherProviderReview = {
        ...mockReview,
        providerId: 'otherProviderId',
      };

      mockProviderReviewModel.findById.mockResolvedValue(otherProviderReview);

      await expect(
        service.addProviderResponse('reviewId123', 'Response', 'providerId123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when trying to respond to already responded review', async () => {
      const reviewWithResponse = {
        ...mockReview,
        providerResponse: {
          text: 'Already responded',
          respondedAt: new Date(),
        },
      };

      mockProviderReviewModel.findById.mockResolvedValue(reviewWithResponse);

      await expect(
        service.addProviderResponse(
          'reviewId123',
          'New response',
          'providerId123',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProviderStatistics', () => {
    it('should return provider statistics', async () => {
      const mockStatistics = {
        providerId: 'providerId123',
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
        lastReviewDate: new Date(),
        toObject: jest.fn().mockReturnValue({
          providerId: 'providerId123',
          averageRating: 4.5,
          totalReviews: 10,
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockProviderStatisticsModel.findOne.mockResolvedValue(mockStatistics);

      const result = await service.getProviderStatistics('providerId123');

      expect(result).toHaveProperty('providerId', 'providerId123');
      expect(result).toHaveProperty('averageRating', 4.5);
      expect(result).toHaveProperty(
        'message',
        'Provider statistics retrieved successfully',
      );
    });

    it('should return default statistics when no reviews exist', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      mockProviderStatisticsModel.findOne.mockResolvedValue(null);

      const result = await service.getProviderStatistics('providerId123');

      expect(result).toHaveProperty('averageRating', 0);
      expect(result).toHaveProperty('totalReviews', 0);
      expect(result).toHaveProperty('message', 'No reviews yet');
    });
  });
});
