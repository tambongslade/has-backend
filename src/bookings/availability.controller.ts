import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AvailabilityService } from './availability.service';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  AvailabilityResponseDto,
} from './dto/availability.dto';

@ApiTags('Availability')
@Controller({ path: 'availability', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiOperation({
    summary: 'Create availability schedule',
    description: 'Create a new availability schedule for the provider',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Availability created successfully',
    type: AvailabilityResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid availability data or already exists',
  })
  async create(
    @Body() createAvailabilityDto: CreateAvailabilityDto,
    @Req() req: any,
  ): Promise<AvailabilityResponseDto> {
    const availability = await this.availabilityService.create(
      req.user.id,
      createAvailabilityDto,
    );

    return {
      id: (availability._id as any).toString(),
      providerId: availability.providerId.toString(),
      dayOfWeek: availability.dayOfWeek,
      timeSlots: availability.timeSlots,
      isActive: availability.isActive,
      notes: availability.notes,
      createdAt: (availability as any).createdAt,
      updatedAt: (availability as any).updatedAt,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get provider availability',
    description:
      'Get all availability schedules for the authenticated provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability schedules retrieved successfully',
    type: [AvailabilityResponseDto],
  })
  async findMine(@Req() req: any): Promise<AvailabilityResponseDto[]> {
    const availabilities = await this.availabilityService.findByProvider(
      req.user.id,
    );

    return availabilities.map((availability) => ({
      id: (availability._id as any).toString(),
      providerId: availability.providerId.toString(),
      dayOfWeek: availability.dayOfWeek,
      timeSlots: availability.timeSlots,
      isActive: availability.isActive,
      notes: availability.notes,
      createdAt: (availability as any).createdAt,
      updatedAt: (availability as any).updatedAt,
    }));
  }

  @Get('provider/:providerId')
  @ApiOperation({
    summary: 'Get provider availability by ID',
    description: 'Get availability schedules for a specific provider (public)',
  })
  @ApiParam({
    name: 'providerId',
    description: 'Provider ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider availability retrieved successfully',
    type: [AvailabilityResponseDto],
  })
  async findByProvider(
    @Param('providerId') providerId: string,
  ): Promise<AvailabilityResponseDto[]> {
    const availabilities =
      await this.availabilityService.findByProvider(providerId);

    return availabilities.map((availability) => ({
      id: (availability._id as any).toString(),
      providerId: availability.providerId.toString(),
      dayOfWeek: availability.dayOfWeek,
      timeSlots: availability.timeSlots,
      isActive: availability.isActive,
      notes: availability.notes,
      createdAt: (availability as any).createdAt,
      updatedAt: (availability as any).updatedAt,
    }));
  }

  @Get('check')
  @ApiOperation({
    summary: 'Check availability',
    description: 'Check if a provider is available at a specific date and time',
  })
  @ApiQuery({
    name: 'providerId',
    description: 'Provider ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'date',
    description: 'Date to check (YYYY-MM-DD)',
    example: '2025-08-06',
  })
  @ApiQuery({
    name: 'startTime',
    description: 'Start time (HH:mm)',
    example: '10:00',
  })
  @ApiQuery({
    name: 'endTime',
    description: 'End time (HH:mm)',
    example: '14:00',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability check result',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        providerId: { type: 'string' },
        date: { type: 'string' },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
      },
    },
  })
  async checkAvailability(
    @Query('providerId') providerId: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    const available = await this.availabilityService.isAvailable(
      providerId,
      new Date(date),
      startTime,
      endTime,
    );

    return {
      available,
      providerId,
      date,
      startTime,
      endTime,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update availability schedule',
    description: 'Update an existing availability schedule',
  })
  @ApiParam({
    name: 'id',
    description: 'Availability ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability updated successfully',
    type: AvailabilityResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Availability not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
    @Req() req: any,
  ): Promise<AvailabilityResponseDto> {
    const availability = await this.availabilityService.update(
      id,
      req.user.id,
      updateAvailabilityDto,
    );

    return {
      id: (availability._id as any).toString(),
      providerId: availability.providerId.toString(),
      dayOfWeek: availability.dayOfWeek,
      timeSlots: availability.timeSlots,
      isActive: availability.isActive,
      notes: availability.notes,
      createdAt: (availability as any).createdAt,
      updatedAt: (availability as any).updatedAt,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete availability schedule',
    description: 'Delete an availability schedule',
  })
  @ApiParam({
    name: 'id',
    description: 'Availability ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Availability not found',
  })
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.availabilityService.remove(id, req.user.id);
    return { message: 'Availability deleted successfully' };
  }

  @Post('default')
  @ApiOperation({
    summary: 'Set default availability',
    description: 'Set default Monday-Friday 9-5 availability for the provider',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Default availability set successfully',
  })
  async setDefault(@Req() req: any) {
    await this.availabilityService.setDefaultAvailability(req.user.id);
    return { message: 'Default availability set successfully' };
  }
}
