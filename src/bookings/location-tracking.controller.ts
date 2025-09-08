import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  LocationTrackingService,
  LocationUpdate,
  StartTrackingRequest,
} from './location-tracking.service';

@ApiTags('Location Tracking')
@Controller({ path: 'sessions', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LocationTrackingController {
  constructor(
    private readonly locationTrackingService: LocationTrackingService,
  ) {}

  @Post(':sessionId/tracking/start')
  @ApiOperation({
    summary: 'Start location tracking for session',
    description: 'Begin GPS tracking for a session (Provider only)',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID to start tracking for',
  })
  @ApiBody({
    description: 'Tracking initialization data',
    schema: {
      type: 'object',
      required: [
        'serviceLatitude',
        'serviceLongitude',
        'providerLatitude',
        'providerLongitude',
      ],
      properties: {
        serviceLatitude: {
          type: 'number',
          description: 'Service location latitude',
          example: 4.0511,
        },
        serviceLongitude: {
          type: 'number',
          description: 'Service location longitude',
          example: 9.7679,
        },
        providerLatitude: {
          type: 'number',
          description: 'Provider current latitude',
          example: 4.0405,
        },
        providerLongitude: {
          type: 'number',
          description: 'Provider current longitude',
          example: 9.7573,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Location tracking started successfully',
  })
  async startTracking(
    @Param('sessionId') sessionId: string,
    @Body() body: Omit<StartTrackingRequest, 'sessionId'>,
    @Request() req: any,
  ) {
    const request: StartTrackingRequest = {
      sessionId,
      ...body,
    };

    return this.locationTrackingService.startTracking(
      request,
      req.user.id,
      req.user.role,
    );
  }

  @Put(':sessionId/tracking/location')
  @ApiOperation({
    summary: 'Update provider location',
    description:
      'Update current GPS coordinates during active session (Provider only)',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID being tracked',
  })
  @ApiBody({
    description: 'Location update data',
    schema: {
      type: 'object',
      required: ['latitude', 'longitude'],
      properties: {
        latitude: {
          type: 'number',
          description: 'Current latitude',
          example: 4.0511,
        },
        longitude: {
          type: 'number',
          description: 'Current longitude',
          example: 9.7679,
        },
        accuracy: {
          type: 'number',
          description: 'GPS accuracy in meters',
          example: 10,
        },
        speed: {
          type: 'number',
          description: 'Current speed in m/s',
          example: 5.5,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location updated successfully',
  })
  async updateLocation(
    @Param('sessionId') sessionId: string,
    @Body() locationUpdate: LocationUpdate,
    @Request() req: any,
  ) {
    return this.locationTrackingService.updateLocation(
      sessionId,
      locationUpdate,
      req.user.id,
      req.user.role,
    );
  }

  @Put(':sessionId/tracking/arrived')
  @ApiOperation({
    summary: 'Mark provider as arrived',
    description:
      'Mark that provider has arrived at service location (Provider only)',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Arrival marked successfully',
  })
  async markArrived(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.locationTrackingService.markArrived(
      sessionId,
      req.user.id,
      req.user.role,
    );
  }

  @Put(':sessionId/tracking/service-started')
  @ApiOperation({
    summary: 'Mark service as started',
    description: 'Mark that service has officially started (Provider only)',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service start marked successfully',
  })
  async markServiceStarted(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.locationTrackingService.markServiceStarted(
      sessionId,
      req.user.id,
      req.user.role,
    );
  }

  @Put(':sessionId/tracking/complete')
  @ApiOperation({
    summary: 'Complete service and stop tracking',
    description:
      'Mark service as completed and stop GPS tracking (Provider only)',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service completed and tracking stopped',
  })
  async completeService(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.locationTrackingService.completeService(
      sessionId,
      req.user.id,
      req.user.role,
    );
  }

  @Get(':sessionId/tracking/seeker')
  @ApiOperation({
    summary: 'Get tracking info for seeker',
    description:
      'Get provider location and service status for seeker (Seeker only)',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID to track',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tracking information retrieved successfully',
  })
  async getSeekerTracking(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.locationTrackingService.getSeekerTracking(
      sessionId,
      req.user.id,
    );
  }

  @Get(':sessionId/tracking/provider')
  @ApiOperation({
    summary: 'Get tracking info for provider',
    description: 'Get own tracking status and details (Provider only)',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider tracking information retrieved successfully',
  })
  async getProviderTracking(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.locationTrackingService.getProviderTracking(
      sessionId,
      req.user.id,
    );
  }

  @Put(':sessionId/tracking/stop')
  @ApiOperation({
    summary: 'Stop location tracking',
    description:
      'Emergency stop of location tracking (Provider, Seeker, or Admin)',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location tracking stopped successfully',
  })
  async stopTracking(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.locationTrackingService.stopTracking(
      sessionId,
      req.user.id,
      req.user.role,
    );
  }
}
