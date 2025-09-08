import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  User,
  UserDocument,
  UserRole,
  ProviderStatus,
} from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateProviderReviewDto } from './dto/create-provider-review.dto';
import {
  SetupProviderProfileDto,
  ProviderProfileResponseDto,
} from './dto/setup-provider-profile.dto';
import { Service, ServiceDocument } from '../services/schemas/service.schema';
import {
  Availability,
  AvailabilityDocument,
} from '../bookings/schemas/availability.schema';
import {
  ProviderReview,
  ProviderReviewDocument,
} from './schemas/provider-review.schema';
import {
  ProviderStatistics,
  ProviderStatisticsDocument,
} from './schemas/provider-statistics.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(Availability.name)
    private availabilityModel: Model<AvailabilityDocument>,
    @InjectModel(ProviderReview.name)
    private providerReviewModel: Model<ProviderReviewDocument>,
    @InjectModel(ProviderStatistics.name)
    private providerStatisticsModel: Model<ProviderStatisticsDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return updatedUser;
  }

  async remove(id: string): Promise<User> {
    const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
    if (!deletedUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return deletedUser;
  }

  async findProviders(search?: string, skip = 0, limit = 20) {
    const query: any = { role: UserRole.PROVIDER };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [providers, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      providers,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProviderProfile(id: string) {
    const provider = await this.userModel
      .findOne({ _id: id, role: UserRole.PROVIDER })
      .select('-password')
      .exec();

    if (!provider) {
      throw new NotFoundException(`Provider with ID "${id}" not found`);
    }

    const [services, availability] = await Promise.all([
      this.serviceModel
        .find({
          providerId: id,
          status: 'active',
          isAvailable: true,
        })
        .select(
          'title description category pricePerHour averageRating totalReviews images',
        )
        .exec(),
      this.availabilityModel
        .find({ providerId: id, isActive: true })
        .select('dayOfWeek timeSlots notes')
        .exec(),
    ]);

    return {
      provider,
      services,
      availability,
      totalServices: services.length,
      averageRating:
        services.length > 0
          ? services.reduce((sum, service) => sum + service.averageRating, 0) /
            services.length
          : 0,
      totalReviews: services.reduce(
        (sum, service) => sum + service.totalReviews,
        0,
      ),
      message: 'Provider profile retrieved successfully',
    };
  }

  async addProviderReview(
    providerId: string,
    createReviewDto: CreateProviderReviewDto,
    reviewerId: string,
  ) {
    // Verify provider exists
    const provider = await this.userModel
      .findOne({ _id: providerId, role: UserRole.PROVIDER })
      .exec();

    if (!provider) {
      throw new NotFoundException(`Provider with ID "${providerId}" not found`);
    }

    // Prevent self-review
    if (providerId === reviewerId) {
      throw new BadRequestException('You cannot review yourself');
    }

    // Check for existing review (handled by unique index, but we'll catch the error)
    try {
      const review = new this.providerReviewModel({
        providerId,
        reviewerId,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
        serviceCategory: createReviewDto.serviceCategory,
        relatedBookingId: createReviewDto.relatedBookingId,
      });

      const savedReview = await review.save();

      // Update provider statistics
      await this.updateProviderStatistics(providerId);

      return {
        review: savedReview,
        message: 'Review added successfully',
      };
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error
        throw new ConflictException('You have already reviewed this provider');
      }
      throw error;
    }
  }

  async getProviderReviews(
    providerId: string,
    skip: number,
    limit: number,
    category?: string,
  ) {
    // Verify provider exists
    const provider = await this.userModel
      .findOne({ _id: providerId, role: UserRole.PROVIDER })
      .exec();

    if (!provider) {
      throw new NotFoundException(`Provider with ID "${providerId}" not found`);
    }

    // Build query
    const query: any = {
      providerId,
      status: 'active', // Only show active reviews
    };

    if (category) {
      query.serviceCategory = category;
    }

    // Get reviews with pagination
    const [reviews, total, statistics] = await Promise.all([
      this.providerReviewModel
        .find(query)
        .populate('reviewerId', 'fullName')
        .populate('relatedBookingId', 'serviceId bookingDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.providerReviewModel.countDocuments(query).exec(),
      this.getProviderReviewStatistics(providerId, category),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statistics,
      message: 'Provider reviews retrieved successfully',
    };
  }

  private async updateProviderStatistics(providerId: string) {
    // Calculate aggregated statistics
    const reviewStats = await this.providerReviewModel.aggregate([
      {
        $match: {
          providerId: providerId,
          status: 'active',
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating',
          },
          lastReviewDate: { $max: '$createdAt' },
        },
      },
    ]);

    if (reviewStats.length === 0) {
      // No reviews yet, ensure provider statistics document exists with defaults
      await this.providerStatisticsModel.findOneAndUpdate(
        { providerId },
        {
          providerId,
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {
            fiveStars: 0,
            fourStars: 0,
            threeStars: 0,
            twoStars: 0,
            oneStar: 0,
          },
          recentReviewsCount: 0,
        },
        { upsert: true, new: true },
      );
      return;
    }

    const { averageRating, totalReviews, ratingDistribution, lastReviewDate } =
      reviewStats[0];

    // Calculate rating distribution
    const distribution = {
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
    };

    ratingDistribution.forEach((rating: number) => {
      switch (rating) {
        case 5:
          distribution.fiveStars++;
          break;
        case 4:
          distribution.fourStars++;
          break;
        case 3:
          distribution.threeStars++;
          break;
        case 2:
          distribution.twoStars++;
          break;
        case 1:
          distribution.oneStar++;
          break;
      }
    });

    // Calculate recent reviews (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReviewsCount = await this.providerReviewModel.countDocuments({
      providerId,
      status: 'active',
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Update or create provider statistics
    await this.providerStatisticsModel.findOneAndUpdate(
      { providerId },
      {
        providerId,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews,
        ratingDistribution: distribution,
        lastReviewDate,
        recentReviewsCount,
      },
      { upsert: true, new: true },
    );
  }

  private async getProviderReviewStatistics(
    providerId: string,
    category?: string,
  ) {
    // Get from provider statistics collection for overall stats
    const providerStats = await this.providerStatisticsModel.findOne({
      providerId,
    });

    // If category filter is applied, calculate category-specific stats
    if (category) {
      const categoryStats = await this.providerReviewModel.aggregate([
        {
          $match: {
            providerId,
            status: 'active',
            serviceCategory: category,
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            ratingDistribution: { $push: '$rating' },
          },
        },
      ]);

      if (categoryStats.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          category,
        };
      }

      const { averageRating, totalReviews, ratingDistribution } =
        categoryStats[0];
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      ratingDistribution.forEach((rating: number) => {
        distribution[rating as keyof typeof distribution]++;
      });

      return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution: distribution,
        category,
      };
    }

    // Return overall statistics
    if (!providerStats) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    return {
      averageRating: providerStats.averageRating,
      totalReviews: providerStats.totalReviews,
      ratingDistribution: {
        5: providerStats.ratingDistribution.fiveStars,
        4: providerStats.ratingDistribution.fourStars,
        3: providerStats.ratingDistribution.threeStars,
        2: providerStats.ratingDistribution.twoStars,
        1: providerStats.ratingDistribution.oneStar,
      },
      recentReviewsCount: providerStats.recentReviewsCount,
      lastReviewDate: providerStats.lastReviewDate,
    };
  }

  async addProviderResponse(
    reviewId: string,
    responseText: string,
    providerId: string,
  ) {
    const review = await this.providerReviewModel.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.providerId.toString() !== providerId) {
      throw new ForbiddenException(
        'You can only respond to reviews for your services',
      );
    }

    if (review.providerResponse) {
      throw new BadRequestException(
        'You have already responded to this review',
      );
    }

    const updatedReview = await this.providerReviewModel
      .findByIdAndUpdate(
        reviewId,
        {
          providerResponse: {
            text: responseText,
            respondedAt: new Date(),
          },
        },
        { new: true },
      )
      .populate('reviewerId', 'fullName')
      .exec();

    return {
      review: updatedReview,
      message: 'Response added successfully',
    };
  }

  async updateProviderResponse(
    reviewId: string,
    responseText: string,
    providerId: string,
  ) {
    const review = await this.providerReviewModel.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.providerId.toString() !== providerId) {
      throw new ForbiddenException(
        'You can only update responses to reviews for your services',
      );
    }

    if (!review.providerResponse) {
      throw new BadRequestException('No response exists to update');
    }

    const updatedReview = await this.providerReviewModel
      .findByIdAndUpdate(
        reviewId,
        {
          'providerResponse.text': responseText,
          'providerResponse.editedAt': new Date(),
        },
        { new: true },
      )
      .populate('reviewerId', 'fullName')
      .exec();

    return {
      review: updatedReview,
      message: 'Response updated successfully',
    };
  }

  async getProviderStatistics(providerId: string) {
    // Verify provider exists
    const provider = await this.userModel
      .findOne({ _id: providerId, role: UserRole.PROVIDER })
      .exec();

    if (!provider) {
      throw new NotFoundException(`Provider with ID "${providerId}" not found`);
    }

    const statistics = await this.providerStatisticsModel.findOne({
      providerId,
    });

    if (!statistics) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          fiveStars: 0,
          fourStars: 0,
          threeStars: 0,
          twoStars: 0,
          oneStar: 0,
        },
        recentReviewsCount: 0,
        lastReviewDate: null,
        message: 'No reviews yet',
      };
    }

    return {
      ...statistics.toObject(),
      message: 'Provider statistics retrieved successfully',
    };
  }

  async setupProviderProfile(
    userId: string,
    setupProfileDto: SetupProviderProfileDto,
  ): Promise<ProviderProfileResponseDto> {
    // Find user and verify they are a provider
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    if (user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException('Only providers can setup profile');
    }

    // Check if profile is already completed
    const isAlreadySetup = this.isProviderProfileComplete(user.providerProfile);

    // Setup provider profile data
    const providerProfileData = {
      serviceCategories: setupProfileDto.serviceCategories,
      serviceAreas: setupProfileDto.serviceAreas,
      serviceRadius: setupProfileDto.serviceRadius,
      experienceLevel: setupProfileDto.experienceLevel,
      certifications: setupProfileDto.certifications || [],
      portfolio: setupProfileDto.portfolio || [],
      bio: setupProfileDto.bio,
      status: ProviderStatus.PENDING_APPROVAL,
      averageRating: user.providerProfile?.averageRating || 0,
      totalCompletedJobs: user.providerProfile?.totalCompletedJobs || 0,
      totalReviews: user.providerProfile?.totalReviews || 0,
      currentLocation: user.providerProfile?.currentLocation,
      lastLocationUpdate: user.providerProfile?.lastLocationUpdate,
      isOnDuty: user.providerProfile?.isOnDuty || false,
    };

    // Update user with provider profile
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { providerProfile: providerProfileData },
        { new: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`Failed to update user profile`);
    }

    // Determine next steps based on profile status
    const nextSteps = this.getProviderNextSteps(
      updatedUser.providerProfile?.status,
    );

    return {
      message: isAlreadySetup
        ? 'Provider profile updated successfully'
        : 'Provider profile setup completed successfully',
      status:
        updatedUser.providerProfile?.status || ProviderStatus.PENDING_APPROVAL,
      isProfileComplete: true,
      nextSteps,
    };
  }

  private isProviderProfileComplete(providerProfile?: any): boolean {
    if (!providerProfile) return false;

    return !!(
      providerProfile.serviceCategories?.length &&
      providerProfile.serviceAreas?.length &&
      providerProfile.serviceRadius &&
      providerProfile.experienceLevel
    );
  }

  async getProviderProfileStatus(userId: string) {
    // Find user and verify they are a provider
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    if (user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException('Only providers can check profile status');
    }

    const isComplete = this.isProviderProfileComplete(user.providerProfile);
    const missingFields = this.getMissingProviderFields(user.providerProfile);
    const status =
      user.providerProfile?.status || ProviderStatus.PENDING_APPROVAL;
    const nextSteps = this.getProviderNextSteps(status);

    return {
      isProfileComplete: isComplete,
      status,
      missingFields,
      nextSteps,
      message: isComplete
        ? `Profile is complete and status is ${status}`
        : 'Profile setup is incomplete',
    };
  }

  private getMissingProviderFields(providerProfile?: any): string[] {
    const missing: string[] = [];

    if (!providerProfile) {
      return [
        'serviceCategories',
        'serviceAreas',
        'serviceRadius',
        'experienceLevel',
      ];
    }

    if (!providerProfile.serviceCategories?.length) {
      missing.push('serviceCategories');
    }
    if (!providerProfile.serviceAreas?.length) {
      missing.push('serviceAreas');
    }
    if (!providerProfile.serviceRadius) {
      missing.push('serviceRadius');
    }
    if (!providerProfile.experienceLevel) {
      missing.push('experienceLevel');
    }

    return missing;
  }

  private getProviderNextSteps(status?: ProviderStatus): string[] {
    switch (status) {
      case ProviderStatus.PENDING_APPROVAL:
        return [
          'Your profile is under review by our admin team',
          'You will receive an email notification once approved',
          'Complete your first service listing while waiting',
          'Ensure your contact information is up to date',
        ];
      case ProviderStatus.ACTIVE:
        return [
          'Create your first service listing',
          'Set your availability schedule',
          'Upload portfolio images to showcase your work',
          'Start accepting bookings from customers',
        ];
      case ProviderStatus.INACTIVE:
        return [
          'Update your profile information',
          'Contact support to reactivate your account',
          'Review and update your service categories',
        ];
      case ProviderStatus.SUSPENDED:
        return [
          'Your account is suspended',
          'Contact support for assistance',
          'Review terms of service',
        ];
      default:
        return ['Complete your profile setup', 'Submit for admin approval'];
    }
  }
}
