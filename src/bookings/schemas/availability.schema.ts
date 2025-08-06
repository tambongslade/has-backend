import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type AvailabilityDocument = Availability &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

@Schema()
export class TimeSlot {
  @Prop({ required: true })
  startTime: string; // Format: "HH:mm"

  @Prop({ required: true })
  endTime: string; // Format: "HH:mm"

  @Prop({ default: true })
  isAvailable: boolean;
}

export const TimeSlotSchema = SchemaFactory.createForClass(TimeSlot);

@Schema({ timestamps: true })
export class Availability {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({
    type: String,
    enum: DayOfWeek,
    required: true,
  })
  dayOfWeek: DayOfWeek; // Weekly recurring availability only

  @Prop({ type: [TimeSlotSchema], default: [] })
  timeSlots: TimeSlot[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  notes?: string;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// Create compound indexes for efficient queries
AvailabilitySchema.index({ providerId: 1, dayOfWeek: 1 });
AvailabilitySchema.index({ providerId: 1, specificDate: 1 });
