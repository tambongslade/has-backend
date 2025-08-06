import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SessionConfig,
  SessionConfigDocument,
  CategoryPricing,
} from './session-config.schema';
import { ServiceCategory } from '../services/schemas/service.schema';

@Injectable()
export class SessionConfigService {
  constructor(
    @InjectModel(SessionConfig.name)
    private sessionConfigModel: Model<SessionConfigDocument>,
  ) {}

  async getActiveConfig(): Promise<SessionConfig> {
    const config = await this.sessionConfigModel
      .findOne({ isActive: true })
      .exec();

    if (!config) {
      // Create default configuration if none exists
      return this.createDefaultConfig();
    }

    return config;
  }

  async getCategoryPricing(
    category: ServiceCategory,
  ): Promise<CategoryPricing> {
    const config = await this.getActiveConfig();
    const categoryPricing = config.categoryPricing.find(
      (cp) => cp.category === category,
    );

    if (!categoryPricing) {
      throw new NotFoundException(
        `Pricing configuration not found for category: ${category}`,
      );
    }

    return categoryPricing;
  }

  async calculateSessionPrice(
    category: ServiceCategory,
    sessionDurationHours: number,
  ): Promise<{
    basePrice: number;
    overtimePrice: number;
    totalPrice: number;
    baseDuration: number;
    overtimeHours: number;
  }> {
    const categoryPricing = await this.getCategoryPricing(category);

    const baseDuration = categoryPricing.baseSessionDuration;
    const basePrice = categoryPricing.baseSessionPrice;

    if (sessionDurationHours <= baseDuration) {
      return {
        basePrice,
        overtimePrice: 0,
        totalPrice: basePrice,
        baseDuration,
        overtimeHours: 0,
      };
    }

    const overtimeHours = sessionDurationHours - baseDuration;
    const overtimeBlocks = Math.ceil(
      (overtimeHours * 60) / categoryPricing.overtimeIncrement,
    );
    const overtimePrice = overtimeBlocks * categoryPricing.overtimeRate;

    return {
      basePrice,
      overtimePrice,
      totalPrice: basePrice + overtimePrice,
      baseDuration,
      overtimeHours,
    };
  }

  async updateCategoryPricing(
    category: ServiceCategory,
    pricing: Partial<CategoryPricing>,
  ): Promise<SessionConfig> {
    const config = await this.getActiveConfig();

    const categoryIndex = config.categoryPricing.findIndex(
      (cp) => cp.category === category,
    );

    if (categoryIndex === -1) {
      throw new NotFoundException(
        `Category pricing not found for: ${category}`,
      );
    }

    // Update the category pricing in the document
    const updatedConfig = await this.sessionConfigModel.findByIdAndUpdate(
      (config as any)._id,
      {
        $set: {
          [`categoryPricing.${categoryIndex}`]: {
            ...config.categoryPricing[categoryIndex],
            ...pricing,
          },
        },
      },
      { new: true },
    );

    return updatedConfig!;
  }

  private async createDefaultConfig(): Promise<SessionConfig> {
    const defaultCategoryPricing: CategoryPricing[] = [
      {
        category: ServiceCategory.CLEANING,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.PLUMBING,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.ELECTRICAL,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.PAINTING,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.GARDENING,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.CARPENTRY,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.COOKING,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.TUTORING,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.BEAUTY,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.MAINTENANCE,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
      {
        category: ServiceCategory.OTHER,
        baseSessionPrice: 3000, // 3,000 FCFA for 4 hours
        baseSessionDuration: 4,
        overtimeRate: 375, // 375 FCFA per 30 minutes
        overtimeIncrement: 30,
      },
    ];

    const defaultConfig = new this.sessionConfigModel({
      categoryPricing: defaultCategoryPricing,
      defaultSessionDuration: 4,
      defaultOvertimeIncrement: 30,
      currency: 'FCFA',
      isActive: true,
      notes: 'Default session configuration with category-based pricing',
    });

    return defaultConfig.save();
  }

  async getAllCategoryPricing(): Promise<CategoryPricing[]> {
    const config = await this.getActiveConfig();
    return config.categoryPricing;
  }
}
