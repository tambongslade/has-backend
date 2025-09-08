import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from '../../bookings/schemas/session.schema';
import {
  Service,
  ServiceDocument,
} from '../../services/schemas/service.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import {
  UpcomingBookingsQueryDto,
  UpcomingBookingsDto,
  UpcomingBooking,
  BookingSummary,
  ServiceInfo,
  SeekerInfo,
} from '../dto/upcoming-bookings.dto';

@Injectable()
export class UpcomingBookingsService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getUpcomingBookings(
    providerId: string,
    query: UpcomingBookingsQueryDto,
  ): Promise<UpcomingBookingsDto> {
    const providerObjectId = new Types.ObjectId(providerId);
    const { limit = 5, days = 7 } = query;

    const now = new Date();
    const lookAheadDate = new Date();
    lookAheadDate.setDate(now.getDate() + days);
    lookAheadDate.setHours(23, 59, 59, 999);

    // Get upcoming sessions with related data
    const upcomingBookings = await this.sessionModel
      .find({
        providerId: providerObjectId,
        status: {
          $in: [SessionStatus.CONFIRMED, SessionStatus.PENDING_ASSIGNMENT],
        },
        sessionDate: { $gte: now, $lte: lookAheadDate },
      })
      .populate('serviceId', 'title category')
      .populate('seekerId', 'fullName phoneNumber')
      .sort({ sessionDate: 1, startTime: 1 })
      .limit(limit)
      .exec();

    // Get summary data
    const summary = await this.getBookingSummary(
      providerObjectId,
      now,
      lookAheadDate,
    );

    // Map bookings to response format
    const mappedBookings = await Promise.all(
      upcomingBookings.map((booking) => this.mapToUpcomingBooking(booking)),
    );

    return {
      upcomingBookings: mappedBookings,
      summary,
    };
  }

  private async getBookingSummary(
    providerId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<BookingSummary> {
    const summaryData = await this.sessionModel.aggregate([
      {
        $match: {
          providerId,
          status: {
            $in: [SessionStatus.CONFIRMED, SessionStatus.PENDING_ASSIGNMENT],
          },
          sessionDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalUpcoming: { $sum: 1 },
          totalEarningsExpected: { $sum: '$totalAmount' },
          nextBooking: { $min: '$sessionDate' },
        },
      },
    ]);

    if (summaryData.length === 0) {
      return {
        nextBooking: new Date().toISOString(),
        totalUpcoming: 0,
        totalEarningsExpected: 0,
      };
    }

    const summary = summaryData[0];

    return {
      nextBooking: summary.nextBooking
        ? summary.nextBooking.toISOString()
        : new Date().toISOString(),
      totalUpcoming: summary.totalUpcoming || 0,
      totalEarningsExpected: summary.totalEarningsExpected || 0,
    };
  }

  private async mapToUpcomingBooking(
    session: SessionDocument,
  ): Promise<UpcomingBooking> {
    // Calculate duration in hours
    const duration = this.calculateDuration(session.startTime, session.endTime);

    // Calculate time until booking
    const timeUntilBooking = this.calculateTimeUntilBooking(
      session.sessionDate,
      session.startTime,
    );

    // Extract service information
    const serviceInfo: ServiceInfo = {
      title:
        (session.serviceId as any)?.title ||
        session.serviceName ||
        'Unknown Service',
      category:
        (session.serviceId as any)?.category || session.category || 'other',
    };

    // Extract seeker information
    const seekerInfo: SeekerInfo = {
      fullName: (session.seekerId as any)?.fullName || 'Unknown User',
      phoneNumber: (session.seekerId as any)?.phoneNumber || 'N/A',
    };

    return {
      _id: (session._id as any).toString(),
      service: serviceInfo,
      seeker: seekerInfo,
      bookingDate: session.sessionDate.toISOString(),
      startTime: session.startTime,
      endTime: session.endTime,
      duration,
      totalAmount: session.totalAmount,
      status: session.status,
      serviceLocation: session.serviceLocation,
      specialInstructions: session.notes,
      timeUntilBooking,
    };
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle case where end time is next day (e.g., 23:00 to 02:00)
    const durationMinutes =
      endMinutes >= startMinutes
        ? endMinutes - startMinutes
        : 24 * 60 - startMinutes + endMinutes;

    return Math.round((durationMinutes / 60) * 10) / 10; // Round to 1 decimal place
  }

  private calculateTimeUntilBooking(
    bookingDate: Date,
    startTime: string,
  ): string {
    const [hour, minute] = startTime.split(':').map(Number);

    // Create datetime for the booking
    const bookingDateTime = new Date(bookingDate);
    bookingDateTime.setHours(hour, minute, 0, 0);

    const now = new Date();
    const timeDiff = bookingDateTime.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return 'Starting now';
    }

    const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
    const hours = Math.floor(
      (timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
    );
    const minutes = Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) {
      return days === 1 ? '1 day' : `${days} days`;
    } else if (hours > 0) {
      if (minutes > 0) {
        return `${hours}h ${minutes}m`;
      }
      return hours === 1 ? '1 hour' : `${hours} hours`;
    } else {
      return minutes <= 1 ? 'Starting soon' : `${minutes} minutes`;
    }
  }

  async getBookingDetails(
    providerId: string,
    bookingId: string,
  ): Promise<UpcomingBooking> {
    const providerObjectId = new Types.ObjectId(providerId);
    const sessionObjectId = new Types.ObjectId(bookingId);

    const session = await this.sessionModel
      .findOne({
        _id: sessionObjectId,
        providerId: providerObjectId,
      })
      .populate('serviceId', 'title category')
      .populate('seekerId', 'fullName phoneNumber')
      .exec();

    if (!session) {
      throw new Error('Session not found');
    }

    return this.mapToUpcomingBooking(session);
  }

  async getBookingsForDate(
    providerId: string,
    date: string,
  ): Promise<UpcomingBooking[]> {
    const providerObjectId = new Types.ObjectId(providerId);
    const targetDate = new Date(date);

    // Set date range for the entire day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.sessionModel
      .find({
        providerId: providerObjectId,
        sessionDate: { $gte: startOfDay, $lte: endOfDay },
        status: {
          $in: [
            SessionStatus.CONFIRMED,
            SessionStatus.PENDING_ASSIGNMENT,
            SessionStatus.IN_PROGRESS,
          ],
        },
      })
      .populate('serviceId', 'title category')
      .populate('seekerId', 'fullName phoneNumber')
      .sort({ startTime: 1 })
      .exec();

    return Promise.all(
      sessions.map((session) => this.mapToUpcomingBooking(session)),
    );
  }
}
