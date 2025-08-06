import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Service,
  ServiceDocument,
  ServiceCategory,
  ServiceStatus,
  CameroonProvince,
} from './schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UserRole } from '../users/schemas/user.schema';

export interface ServiceFilters {
  category?: ServiceCategory;
  location?: CameroonProvince;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  search?: string;
}

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  async create(
    createServiceDto: CreateServiceDto,
    providerId: string,
    userRole?: UserRole,
  ): Promise<Service> {
    // Validate that only providers can create services
    if (userRole && userRole !== UserRole.PROVIDER) {
      throw new ForbiddenException('Only providers can create services');
    }

    const service = new this.serviceModel({
      ...createServiceDto,
      providerId,
      currency: 'FCFA', // Default currency as per user preference
    });

    return service.save();
  }

  async findAll(
    filters: ServiceFilters = {},
    skip = 0,
    limit = 20,
  ): Promise<Service[]> {
    const query: any = { status: ServiceStatus.ACTIVE, isAvailable: true };

    // Apply filters
    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.location) {
      query.location = filters.location;
    }

    if (filters.minPrice || filters.maxPrice) {
      query.pricePerHour = {};
      if (filters.minPrice) query.pricePerHour.$gte = filters.minPrice;
      if (filters.maxPrice) query.pricePerHour.$lte = filters.maxPrice;
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { tags: { $in: [new RegExp(filters.search, 'i')] } },
      ];
    }

    return this.serviceModel
      .find(query)
      .populate('providerId', 'fullName email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.serviceModel
      .findById(id)
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async findByProvider(providerId: string): Promise<Service[]> {
    return this.serviceModel
      .find({ providerId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Service> {
    const service = await this.serviceModel.findById(id);

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Only the provider who created the service can update it
    if (
      service.providerId.toString() !== userId &&
      userRole !== UserRole.PROVIDER
    ) {
      throw new ForbiddenException('You can only update your own services');
    }

    const updatedService = await this.serviceModel
      .findByIdAndUpdate(id, updateServiceDto, { new: true })
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    return updatedService!;
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const service = await this.serviceModel.findById(id);

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Only the provider who created the service can delete it
    if (
      service.providerId.toString() !== userId &&
      userRole !== UserRole.PROVIDER
    ) {
      throw new ForbiddenException('You can only delete your own services');
    }

    await this.serviceModel.findByIdAndDelete(id);
  }

  async searchByLocation(
    location: CameroonProvince,
    limit = 20,
  ): Promise<Service[]> {
    return this.serviceModel
      .find({
        location: location,
        status: ServiceStatus.ACTIVE,
        isAvailable: true,
      })
      .populate('providerId', 'fullName email phoneNumber')
      .sort({ averageRating: -1 })
      .limit(limit)
      .exec();
  }

  async getCategories(): Promise<string[]> {
    return Object.values(ServiceCategory);
  }

  async updateRating(
    serviceId: string,
    newRating: number,
    totalReviews: number,
  ): Promise<Service> {
    const updatedService = await this.serviceModel
      .findByIdAndUpdate(
        serviceId,
        {
          averageRating: newRating,
          totalReviews,
        },
        { new: true },
      )
      .exec();

    if (!updatedService) {
      throw new NotFoundException('Service not found');
    }

    return updatedService;
  }

  async findProvidersByCategory(
    category: ServiceCategory,
    skip = 0,
    limit = 20,
  ) {
    const services = await this.serviceModel
      .find({
        category,
        status: ServiceStatus.ACTIVE,
        isAvailable: true,
      })
      .populate('providerId', 'fullName email phoneNumber')
      .sort({ averageRating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Group by provider to avoid duplicates
    const providersMap = new Map();
    services.forEach((service) => {
      const providerId = service.providerId._id.toString();
      if (!providersMap.has(providerId)) {
        providersMap.set(providerId, {
          provider: service.providerId,
          services: [],
        });
      }
      providersMap.get(providerId).services.push({
        _id: service._id,
        title: service.title,
        category: service.category,
        averageRating: service.averageRating,
        totalReviews: service.totalReviews,
      });
    });

    const providers = Array.from(providersMap.values());
    const total = await this.serviceModel
      .distinct('providerId', {
        category,
        status: ServiceStatus.ACTIVE,
        isAvailable: true,
      })
      .exec();

    return {
      providers,
      category,
      pagination: {
        total: total.length,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total.length / limit),
      },
    };
  }
}
