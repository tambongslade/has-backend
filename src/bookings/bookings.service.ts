import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Booking,
  BookingDocument,
  BookingStatus,
  PaymentStatus,
} from './schemas/booking.schema';
import {
  Availability,
  AvailabilityDocument,
  DayOfWeek,
} from './schemas/availability.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AvailabilityService } from './availability.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ServicesService } from '../services/services.service';
import { UserRole } from '../users/schemas/user.schema';

/**
 * @deprecated This service is for legacy bookings.
 * Use SessionsService for new session-based bookings with category pricing.
 */
@Injectable()
export class BookingsService {
  private walletService: any; // Will be injected later to avoid circular dependency

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Availability.name)
    private availabilityModel: Model<AvailabilityDocument>,
    private servicesService: ServicesService,
    private availabilityService: AvailabilityService,
  ) {}

  // Method to set wallet service (called from wallet module)
  setWalletService(walletService: any) {
    this.walletService = walletService;
  }

  // ============ BOOKING MANAGEMENT ============

  async createBooking(
    createBookingDto: CreateBookingDto,
    seekerId: string,
  ): Promise<Booking> {
    const service = await this.servicesService.findOne(
      createBookingDto.serviceId,
    );

    if (!service.isAvailable) {
      throw new ConflictException(
        'Service is currently not available for booking',
      );
    }

    // Note: Duration validation is now handled by the session-based system
    // No more minimum/maximum booking hours on services

    // Check if the provider is available for the requested time
    const isProviderAvailable = await this.checkProviderAvailability(
      service.providerId.toString(),
      new Date(createBookingDto.bookingDate),
      createBookingDto.startTime,
      createBookingDto.endTime,
    );

    if (!isProviderAvailable) {
      throw new ConflictException(
        'Provider is not available at the requested time',
      );
    }

    // Check for conflicts with existing bookings
    const hasConflict = await this.checkBookingConflict(
      service.providerId.toString(),
      new Date(createBookingDto.bookingDate),
      createBookingDto.startTime,
      createBookingDto.endTime,
    );

    if (hasConflict) {
      throw new ConflictException(
        'Provider already has a booking at the requested time',
      );
    }

    // Note: Pricing is now handled by the session-based system
    // This booking system is legacy - use SessionsService for new bookings
    const totalAmount = 0; // Legacy system - pricing should be handled by sessions

    const booking = new this.bookingModel({
      ...createBookingDto,
      seekerId,
      providerId: service.providerId,
      serviceName: service.title, // Cache service name
      bookingDate: new Date(createBookingDto.bookingDate),
      totalAmount,
      currency: 'FCFA',
    });

    return booking.save();
  }

  async findAll(filter: any = {}, skip = 0, limit = 20): Promise<Booking[]> {
    return this.bookingModel
      .find(filter)
      .populate('serviceId', 'title category')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findBySeeker(seekerId: string, status?: string, skip = 0, limit = 20) {
    const query: any = { seekerId };

    if (status) {
      query.status = status;
    }

    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find(query)
        .populate('serviceId', 'title category images')
        .populate('providerId', 'fullName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookingModel.countDocuments(query).exec(),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalBookings: total,
        ...(await this.getBookingStatusSummary(seekerId, 'seeker')),
      },
    };
  }

  async findByProvider(
    providerId: string,
    status?: string,
    skip = 0,
    limit = 20,
  ) {
    const query: any = { providerId };

    if (status) {
      query.status = status;
    }

    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find(query)
        .populate('serviceId', 'title category images')
        .populate('seekerId', 'fullName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookingModel.countDocuments(query).exec(),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalBookings: total,
        ...(await this.getBookingStatusSummary(providerId, 'provider')),
      },
    };
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingModel
      .findById(id)
      .populate('serviceId', 'title category description')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async updateBooking(
    id: string,
    updateBookingDto: UpdateBookingDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Check if user has permission to update this booking
    const canUpdate =
      booking.seekerId.toString() === userId ||
      booking.providerId.toString() === userId ||
      userRole === UserRole.PROVIDER; // Assuming admins can update any booking

    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to update this booking',
      );
    }

    // If updating time or date, check availability again
    if (
      updateBookingDto.bookingDate ||
      updateBookingDto.startTime ||
      updateBookingDto.endTime
    ) {
      const bookingDate = updateBookingDto.bookingDate
        ? new Date(updateBookingDto.bookingDate)
        : booking.bookingDate;
      const startTime = updateBookingDto.startTime || booking.startTime;
      const endTime = updateBookingDto.endTime || booking.endTime;

      const hasConflict = await this.checkBookingConflict(
        booking.providerId.toString(),
        bookingDate,
        startTime,
        endTime,
        id, // Exclude current booking from conflict check
      );

      if (hasConflict) {
        throw new ConflictException(
          'Provider already has a booking at the requested time',
        );
      }
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(id, updateBookingDto, { new: true })
      .populate('serviceId', 'title category description')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    // If booking is being marked as completed, process the earning
    if (
      updateBookingDto.status === BookingStatus.COMPLETED &&
      booking.status !== BookingStatus.COMPLETED &&
      this.walletService
    ) {
      try {
        await this.walletService.processEarning(
          booking.providerId.toString(),
          id,
          booking.totalAmount,
        );
      } catch (error) {
        console.error('Error processing earning:', error);
        // Don't fail the booking update if wallet processing fails
      }
    }

    return updatedBooking!;
  }

  async cancelBooking(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Only seeker or provider can cancel
    if (
      booking.seekerId.toString() !== userId &&
      booking.providerId.toString() !== userId
    ) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    // Cannot cancel completed bookings
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed bookings');
    }

    return this.updateBooking(
      id,
      {
        status: BookingStatus.CANCELLED,
        cancellationReason: reason,
      },
      userId,
      UserRole.SEEKER,
    );
  }

  // ============ AVAILABILITY MANAGEMENT ============

  async createAvailability(
    createAvailabilityDto: CreateAvailabilityDto,
    providerId: string,
  ): Promise<Availability> {
    // Check if availability already exists for this day
    const existingAvailability = await this.availabilityModel.findOne({
      providerId,
      dayOfWeek: createAvailabilityDto.dayOfWeek,
    });

    if (existingAvailability) {
      throw new ConflictException(
        `Availability for ${createAvailabilityDto.dayOfWeek} already exists`,
      );
    }

    const availability = new this.availabilityModel({
      ...createAvailabilityDto,
      providerId,
    });

    return availability.save();
  }

  async getProviderAvailability(providerId: string): Promise<Availability[]> {
    return this.availabilityModel
      .find({ providerId, isActive: true })
      .sort({ dayOfWeek: 1 })
      .exec();
  }

  async updateAvailability(
    id: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
    providerId: string,
  ): Promise<Availability> {
    const availability = await this.availabilityModel.findById(id);

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.providerId.toString() !== providerId) {
      throw new ForbiddenException('You can only update your own availability');
    }

    const updatedAvailability = await this.availabilityModel
      .findByIdAndUpdate(id, updateAvailabilityDto, { new: true })
      .exec();

    return updatedAvailability!;
  }

  async updateAvailabilityByDay(
    dayOfWeek: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
    providerId: string,
  ): Promise<Availability> {
    const normalizedDay = dayOfWeek.toLowerCase();

    // Try to find existing availability
    let availability = await this.availabilityModel.findOne({
      providerId,
      dayOfWeek: normalizedDay,
    });

    if (!availability) {
      // Create new availability if it doesn't exist
      const createAvailabilityDto = {
        dayOfWeek: normalizedDay,
        ...updateAvailabilityDto,
      };

      availability = new this.availabilityModel({
        providerId,
        ...createAvailabilityDto,
      });

      return await availability.save();
    }

    // Update existing availability
    const updatedAvailability = await this.availabilityModel
      .findByIdAndUpdate(availability._id, updateAvailabilityDto, { new: true })
      .exec();

    return updatedAvailability!;
  }

  async deleteAvailability(id: string, providerId: string): Promise<void> {
    const availability = await this.availabilityModel.findById(id);

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.providerId.toString() !== providerId) {
      throw new ForbiddenException('You can only delete your own availability');
    }

    await this.availabilityModel.findByIdAndDelete(id);
  }

  // ============ HELPER METHODS ============

  private async checkProviderAvailability(
    providerId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    return this.availabilityService.isAvailable(
      providerId,
      date,
      startTime,
      endTime,
    );
  }

  private async checkBookingConflict(
    providerId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const query: any = {
      providerId,
      bookingDate: date,
      status: {
        $in: [
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.IN_PROGRESS,
        ],
      },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    const conflictingBooking = await this.bookingModel.findOne(query);
    return !!conflictingBooking;
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

  // ============ REVIEW SYSTEM ============

  async addReview(
    bookingId: string,
    reviewDto: CreateReviewDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const booking = await this.findOne(bookingId);

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed bookings');
    }

    const updateData: any = {};

    if (booking.seekerId.toString() === userId) {
      updateData.seekerRating = reviewDto.rating;
      updateData.seekerReview = reviewDto.review;
    } else if (booking.providerId.toString() === userId) {
      updateData.providerRating = reviewDto.rating;
      updateData.providerReview = reviewDto.review;
    } else {
      throw new ForbiddenException(
        'You can only review bookings you were part of',
      );
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(bookingId, updateData, { new: true })
      .populate('serviceId', 'title category description')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    // Update service average rating if seeker reviewed
    if (updateData.seekerRating) {
      await this.updateServiceRating(booking.serviceId.toString());
    }

    return updatedBooking!;
  }

  private async updateServiceRating(serviceId: string): Promise<void> {
    const ratings = await this.bookingModel.aggregate([
      { $match: { serviceId: serviceId, seekerRating: { $exists: true } } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$seekerRating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (ratings.length > 0) {
      const { averageRating, totalReviews } = ratings[0];
      await this.servicesService.updateRating(
        serviceId,
        averageRating,
        totalReviews,
      );
    }
  }

  private async getBookingStatusSummary(
    userId: string,
    userType: 'seeker' | 'provider',
  ) {
    const userField = userType === 'seeker' ? 'seekerId' : 'providerId';

    const statusCounts = await this.bookingModel.aggregate([
      { $match: { [userField]: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const summary = {
      pending: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      totalEarnings: 0,
    };

    statusCounts.forEach(({ _id, count, totalAmount }) => {
      switch (_id) {
        case BookingStatus.PENDING:
          summary.pending = count;
          break;
        case BookingStatus.CONFIRMED:
          summary.confirmed = count;
          break;
        case BookingStatus.IN_PROGRESS:
          summary.inProgress = count;
          break;
        case BookingStatus.COMPLETED:
          summary.completed = count;
          if (userType === 'provider') {
            summary.totalEarnings += totalAmount;
          }
          break;
        case BookingStatus.CANCELLED:
          summary.cancelled = count;
          break;
        case BookingStatus.REJECTED:
          summary.rejected = count;
          break;
      }
    });

    return summary;
  }

  // ============ PAYMENT INTEGRATION ============

  async getBookingPaymentInfo(bookingId: string, userId: string) {
    const booking = await this.bookingModel
      .findById(bookingId)
      .populate('serviceId', 'title category description')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if user is the seeker (only seekers can pay for bookings)
    if (booking.seekerId.toString() !== userId) {
      throw new ForbiddenException(
        'Only the seeker can view payment information for this booking',
      );
    }

    return {
      bookingId: booking._id?.toString() || bookingId,
      amount: booking.totalAmount,
      currency: booking.currency,
      paymentStatus: booking.paymentStatus,
      canPay:
        booking.status === BookingStatus.CONFIRMED &&
        booking.paymentStatus === PaymentStatus.PENDING,
      service: {
        title: (booking.serviceId as any)?.title,
        category: (booking.serviceId as any)?.category,
      },
      provider: {
        name: (booking.providerId as any)?.fullName,
      },
      bookingDetails: {
        date: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        duration: booking.duration,
      },
      message: this.getPaymentStatusMessage(
        booking.paymentStatus,
        booking.status,
      ),
    };
  }

  async updateBookingPaymentStatus(
    bookingId: string,
    paymentStatus: PaymentStatus,
    paymentReference?: string,
  ): Promise<Booking> {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const updateData: any = { paymentStatus };

    // If payment is successful and booking is pending, auto-confirm it
    if (
      paymentStatus === PaymentStatus.PAID &&
      booking.status === BookingStatus.PENDING
    ) {
      updateData.status = BookingStatus.CONFIRMED;
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(bookingId, updateData, { new: true })
      .populate('serviceId', 'title category description')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    return updatedBooking!;
  }

  async getBookingsRequiringPayment(seekerId: string, skip = 0, limit = 10) {
    const query = {
      seekerId,
      status: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
    };

    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find(query)
        .populate('serviceId', 'title category images')
        .populate('providerId', 'fullName email phoneNumber')
        .sort({ bookingDate: 1 }) // Sort by booking date (earliest first)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookingModel.countDocuments(query).exec(),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalUnpaidBookings: total,
        totalAmountDue: bookings.reduce(
          (sum, booking) => sum + booking.totalAmount,
          0,
        ),
      },
    };
  }

  private getPaymentStatusMessage(
    paymentStatus: PaymentStatus,
    bookingStatus: BookingStatus,
  ): string {
    switch (paymentStatus) {
      case PaymentStatus.PENDING:
        if (bookingStatus === BookingStatus.CONFIRMED) {
          return 'Payment is required to secure this booking';
        } else if (bookingStatus === BookingStatus.PENDING) {
          return 'Booking is pending confirmation. Payment will be required once confirmed.';
        }
        return 'Payment is pending';
      case PaymentStatus.PAID:
        return 'Payment completed successfully';
      case PaymentStatus.FAILED:
        return 'Payment failed. Please try again or use a different payment method.';
      case PaymentStatus.REFUNDED:
        return 'Payment has been refunded';
      default:
        return 'Unknown payment status';
    }
  }

  // Helper method to check if booking can be paid
  async canBookingBePaid(bookingId: string): Promise<boolean> {
    const booking = await this.bookingModel.findById(bookingId).exec();

    if (!booking) {
      return false;
    }

    return (
      booking.status === BookingStatus.CONFIRMED &&
      booking.paymentStatus === PaymentStatus.PENDING
    );
  }

  // Method to update payment status from payment controller
  async updatePaymentStatus(
    bookingId: string,
    paymentStatus: 'pending' | 'paid' | 'failed',
  ): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Map string status to enum
    let mappedStatus: PaymentStatus;
    switch (paymentStatus) {
      case 'pending':
        mappedStatus = PaymentStatus.PENDING;
        break;
      case 'paid':
        mappedStatus = PaymentStatus.PAID;
        break;
      case 'failed':
        mappedStatus = PaymentStatus.FAILED;
        break;
      default:
        throw new BadRequestException('Invalid payment status');
    }

    const updateData: any = { paymentStatus: mappedStatus };

    // If payment is successful and booking is pending, auto-confirm it
    if (
      mappedStatus === PaymentStatus.PAID &&
      booking.status === BookingStatus.PENDING
    ) {
      updateData.status = BookingStatus.CONFIRMED;
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(bookingId, updateData, { new: true })
      .populate('serviceId', 'title category description')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();

    return updatedBooking!;
  }

  // Method to find booking by ID (needed by payments controller)
  async findById(bookingId: string): Promise<BookingDocument | null> {
    return this.bookingModel
      .findById(bookingId)
      .populate('serviceId', 'title category description')
      .populate('seekerId', 'fullName email phoneNumber')
      .populate('providerId', 'fullName email phoneNumber')
      .exec();
  }
}
