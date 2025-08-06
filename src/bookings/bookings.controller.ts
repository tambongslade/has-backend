import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ============ BOOKING ENDPOINTS ============

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new booking (Seeker only)',
    description: 'Allows seekers to book a service from a provider',
  })
  @ApiBody({
    type: CreateBookingDto,
    description: 'Booking details',
    examples: {
      example1: {
        summary: 'House cleaning booking',
        value: {
          serviceId: '507f1f77bcf86cd799439011',
          bookingDate: '2024-12-15',
          startTime: '09:00',
          endTime: '17:00',
          duration: 8,
          serviceLocation: 'Littoral',
          specialInstructions: 'Please bring eco-friendly supplies',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Booking created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Provider not available or booking conflict',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid booking data or duration limits exceeded',
  })
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    return this.bookingsService.createBooking(createBookingDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all bookings (Admin only)',
    description: 'Retrieve all bookings in the system with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bookings retrieved successfully',
  })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    const validatedLimit = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * validatedLimit;

    return this.bookingsService.findAll(skip, validatedLimit);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my bookings (Seeker)',
    description:
      'Retrieve all bookings made by the authenticated seeker with optional filtering',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'pending',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'rejected',
    ],
    description: 'Filter by booking status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'My bookings retrieved successfully',
  })
  async getMyBookings(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const validatedLimit = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * validatedLimit;

    return this.bookingsService.findBySeeker(
      req.user.id,
      status,
      skip,
      validatedLimit,
    );
  }

  @Get('provider-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get provider bookings (Provider)',
    description:
      'Retrieve all bookings for the authenticated provider with optional filtering',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'pending',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'rejected',
    ],
    description: 'Filter by booking status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider bookings retrieved successfully',
  })
  async getProviderBookings(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const validatedLimit = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * validatedLimit;

    return this.bookingsService.findByProvider(
      req.user.id,
      status,
      skip,
      validatedLimit,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get booking by ID',
    description: 'Retrieve detailed information about a specific booking',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update booking',
    description: 'Update a booking (only by seeker or provider involved)',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Can only update your own bookings',
  })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req,
  ) {
    return this.bookingsService.updateBooking(
      id,
      updateBookingDto,
      req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel booking',
    description: 'Cancel a booking (seeker or provider can cancel)',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
  })
  @ApiBody({
    schema: {
      properties: {
        reason: {
          type: 'string',
          example: 'Schedule conflict',
          description: 'Reason for cancellation',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking cancelled successfully',
  })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.bookingsService.cancelBooking(id, req.user.id, reason);
  }

  // ============ AVAILABILITY ENDPOINTS ============

  @Post('availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create availability (Provider only)',
    description:
      'Allows providers to set their availability for a specific day',
  })
  @ApiBody({
    type: CreateAvailabilityDto,
    description: 'Availability details',
    examples: {
      example1: {
        summary: 'Monday availability',
        value: {
          dayOfWeek: 'monday',
          timeSlots: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '14:00', endTime: '18:00', isAvailable: true },
          ],
          notes: 'Available for emergency calls',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Availability created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Availability for this day already exists',
  })
  async createAvailability(
    @Body() createAvailabilityDto: CreateAvailabilityDto,
    @Request() req,
  ) {
    return this.bookingsService.createAvailability(
      createAvailabilityDto,
      req.user.id,
    );
  }

  @Get('availability/provider/:providerId')
  @ApiOperation({
    summary: 'Get provider availability',
    description: 'Retrieve availability schedule for a specific provider',
  })
  @ApiParam({
    name: 'providerId',
    description: 'Provider ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider availability retrieved successfully',
  })
  async getProviderAvailability(@Param('providerId') providerId: string) {
    return this.bookingsService.getProviderAvailability(providerId);
  }

  @Get('availability/my-schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my availability schedule (Provider)',
    description:
      'Retrieve availability schedule for the authenticated provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'My availability retrieved successfully',
  })
  async getMyAvailability(@Request() req) {
    return this.bookingsService.getProviderAvailability(req.user.id);
  }

  @Patch('availability/day/:dayOfWeek')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or update availability by day (Provider only)',
    description:
      "Create new availability if it doesn't exist, or update existing availability for a specific day of the week",
  })
  @ApiParam({
    name: 'dayOfWeek',
    description: 'Day of the week (monday, tuesday, etc.)',
    enum: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability created or updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Can only update your own availability',
  })
  async updateAvailabilityByDay(
    @Param('dayOfWeek') dayOfWeek: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
    @Request() req,
  ) {
    return this.bookingsService.updateAvailabilityByDay(
      dayOfWeek,
      updateAvailabilityDto,
      req.user.id,
    );
  }

  @Patch('availability/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update availability by ID (Provider only)',
    description: 'Update availability settings using availability ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Availability ID (ObjectId)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Availability not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Can only update your own availability',
  })
  async updateAvailability(
    @Param('id') id: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
    @Request() req,
  ) {
    return this.bookingsService.updateAvailability(
      id,
      updateAvailabilityDto,
      req.user.id,
    );
  }

  @Delete('availability/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete availability (Provider only)',
    description: 'Delete availability for a specific day',
  })
  @ApiParam({
    name: 'id',
    description: 'Availability ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Availability not found',
  })
  async deleteAvailability(@Param('id') id: string, @Request() req) {
    await this.bookingsService.deleteAvailability(id, req.user.id);
    return { message: 'Availability deleted successfully' };
  }

  // ============ REVIEW ENDPOINTS ============

  @Post(':id/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add review to booking',
    description: 'Add a rating and review to a completed booking',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
  })
  @ApiBody({
    type: CreateReviewDto,
    description: 'Review details',
    examples: {
      seeker: {
        summary: 'Seeker review',
        value: {
          rating: 5,
          review: 'Excellent service! Very professional and thorough cleaning.',
        },
      },
      provider: {
        summary: 'Provider review',
        value: {
          rating: 4,
          review: 'Great client, very clear instructions and punctual.',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only review completed bookings',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Can only review bookings you were part of',
  })
  async addReview(
    @Param('id') id: string,
    @Body() createReviewDto: CreateReviewDto,
    @Request() req,
  ) {
    return this.bookingsService.addReview(
      id,
      createReviewDto,
      req.user.id,
      req.user.role,
    );
  }

  // ============ PAYMENT INTEGRATION ENDPOINTS ============

  @Get(':id/payment-info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get booking payment information',
    description: 'Get payment details and status for a specific booking',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment information retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - only booking seeker can view payment info',
  })
  async getBookingPaymentInfo(
    @Param('id') bookingId: string,
    @Request() req: any,
  ) {
    return this.bookingsService.getBookingPaymentInfo(bookingId, req.user.id);
  }

  @Get('seeker/pending-payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get bookings requiring payment',
    description:
      'Get all confirmed bookings that still require payment from the seeker',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending payment bookings retrieved successfully',
  })
  async getBookingsRequiringPayment(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const validatedLimit = Math.min(Number(limit), 20);
    const skip = (Number(page) - 1) * validatedLimit;

    return this.bookingsService.getBookingsRequiringPayment(
      req.user.id,
      skip,
      validatedLimit,
    );
  }

  @Get(':id/can-pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if booking can be paid',
    description: 'Check if a booking is eligible for payment',
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment eligibility check completed',
    schema: {
      type: 'object',
      properties: {
        canPay: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async canBookingBePaid(@Param('id') bookingId: string) {
    const canPay = await this.bookingsService.canBookingBePaid(bookingId);
    return {
      canPay,
      message: canPay
        ? 'Booking is eligible for payment'
        : 'Booking is not eligible for payment at this time',
    };
  }
}
