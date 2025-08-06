import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Availability,
  AvailabilityDocument,
  DayOfWeek,
} from './schemas/availability.schema';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
} from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name)
    private availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async create(
    providerId: string,
    createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<AvailabilityDocument> {
    // Check for existing availability for this day of week
    const existing = await this.availabilityModel.findOne({
      providerId,
      dayOfWeek: createAvailabilityDto.dayOfWeek,
    });

    if (existing) {
      throw new BadRequestException(
        `Availability already exists for ${createAvailabilityDto.dayOfWeek}`,
      );
    }

    const availability = new this.availabilityModel({
      providerId,
      ...createAvailabilityDto,
    });

    return availability.save();
  }

  async findByProvider(providerId: string): Promise<AvailabilityDocument[]> {
    return this.availabilityModel
      .find({ providerId, isActive: true })
      .sort({ dayOfWeek: 1 })
      .exec();
  }

  async findByProviderAndDate(
    providerId: string,
    date: Date,
  ): Promise<AvailabilityDocument | null> {
    const dayOfWeek = this.getDayOfWeek(date);

    // Find weekly recurring availability for this day
    const availability = await this.availabilityModel
      .findOne({
        providerId,
        dayOfWeek,
        isActive: true,
      })
      .exec();

    return availability;
  }

  async update(
    id: string,
    providerId: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
  ): Promise<AvailabilityDocument> {
    const availability = await this.availabilityModel.findOne({
      _id: id,
      providerId,
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    Object.assign(availability, updateAvailabilityDto);
    return availability.save();
  }

  async remove(id: string, providerId: string): Promise<void> {
    const result = await this.availabilityModel.deleteOne({
      _id: id,
      providerId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Availability not found');
    }
  }

  async isAvailable(
    providerId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    const availability = await this.findByProviderAndDate(providerId, date);

    if (!availability || !availability.isActive) {
      return false;
    }

    // Check if the requested time slot overlaps with any available slot
    return availability.timeSlots.some((slot) => {
      if (!slot.isAvailable) return false;

      // Check if requested time falls within this slot
      return startTime >= slot.startTime && endTime <= slot.endTime;
    });
  }

  private getDayOfWeek(date: Date): DayOfWeek {
    const days = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return days[date.getDay()];
  }

  async setDefaultAvailability(providerId: string): Promise<void> {
    // Set default Monday-Friday 9-5 availability
    const defaultDays = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
    ];

    for (const day of defaultDays) {
      const existing = await this.availabilityModel.findOne({
        providerId,
        dayOfWeek: day,
      });

      if (!existing) {
        await this.create(providerId, {
          dayOfWeek: day,
          timeSlots: [
            {
              startTime: '09:00',
              endTime: '17:00',
              isAvailable: true,
            },
          ],
          notes: 'Default availability',
        });
      }
    }
  }
}
