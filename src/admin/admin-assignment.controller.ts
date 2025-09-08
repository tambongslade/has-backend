import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
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
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import {
  AdminAssignmentService,
  ProviderFilterOptions,
  AssignmentRequest,
  AvailableProvidersResponse,
} from './admin-assignment.service';
import {
  RejectAssignmentDto,
  RejectAssignmentResponseDto,
} from './dto/reject-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('Admin - Assignment Management')
@Controller({ path: 'admin/assignments', version: '1' })
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class AdminAssignmentController {
  constructor(
    private readonly adminAssignmentService: AdminAssignmentService,
  ) {}

  @Get('pending')
  @ApiOperation({
    summary: 'Get all pending session assignments',
    description: 'Retrieve sessions that are awaiting provider assignment',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending assignments retrieved successfully',
  })
  async getPendingAssignments(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (page - 1) * limit;
    return this.adminAssignmentService.getPendingAssignments(skip, limit);
  }

  @Get('providers/:sessionId')
  @ApiOperation({
    summary: 'Find available providers for a session',
    description:
      'Get list of providers available for assignment to a specific session',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID to find providers for',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by service category',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by provider location',
  })
  @ApiQuery({
    name: 'minRating',
    required: false,
    description: 'Minimum provider rating',
    type: Number,
  })
  @ApiQuery({
    name: 'experienceLevel',
    required: false,
    description: 'Provider experience level',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available providers retrieved successfully',
  })
  async findAvailableProviders(
    @Param('sessionId') sessionId: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('minRating') minRating?: number,
    @Query('experienceLevel') experienceLevel?: string,
  ): Promise<AvailableProvidersResponse> {
    const filters: ProviderFilterOptions = {};

    if (category) filters.category = category as any;
    if (location) filters.location = location as any;
    if (minRating) filters.minRating = minRating;
    if (experienceLevel) filters.experienceLevel = experienceLevel;

    return this.adminAssignmentService.findAvailableProviders(
      sessionId,
      filters,
    );
  }

  @Post('assign')
  @ApiOperation({
    summary: 'Assign provider to session',
    description: 'Assign a specific provider to handle a session',
  })
  @ApiBody({
    description: 'Assignment details',
    schema: {
      type: 'object',
      required: ['sessionId', 'providerId'],
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID to assign',
        },
        providerId: {
          type: 'string',
          description: 'Provider ID to assign to session',
        },
        notes: {
          type: 'string',
          description: 'Optional assignment notes',
        },
      },
    },
    examples: {
      assignment: {
        summary: 'Assign provider to session',
        value: {
          sessionId: '507f1f77bcf86cd799439011',
          providerId: '507f1f77bcf86cd799439012',
          notes: 'Provider has excellent ratings for this service category',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider assigned successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session or provider not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Provider not available or conflicts exist',
  })
  async assignProvider(
    @Body() assignmentRequest: AssignmentRequest,
    @Request() req: any,
  ) {
    return this.adminAssignmentService.assignProvider(
      assignmentRequest,
      req.user.id,
    );
  }

  @Put(':sessionId/reject')
  @ApiOperation({
    summary: 'Reject service request',
    description:
      'Reject a service request with reason and optional admin notes',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID to reject',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    description: 'Rejection details',
    type: RejectAssignmentDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service request rejected successfully',
    type: RejectAssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Session is not pending assignment or already processed',
  })
  async rejectServiceRequest(
    @Param('sessionId') sessionId: string,
    @Body() rejectAssignmentDto: RejectAssignmentDto,
    @Request() req: any,
  ): Promise<RejectAssignmentResponseDto> {
    return this.adminAssignmentService.rejectServiceRequest(
      sessionId,
      rejectAssignmentDto,
      req.user.id,
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get assignment statistics',
    description: 'Retrieve statistics about session assignments',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment statistics retrieved successfully',
  })
  async getAssignmentStats() {
    return this.adminAssignmentService.getAssignmentStats();
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get assignment history',
    description: 'View history of all assignments made by admins',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'adminId',
    required: false,
    description: 'Filter by admin who made assignments',
  })
  async getAssignmentHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('adminId') adminId?: string,
  ) {
    // This would be implemented to show assignment history
    // For now, return placeholder
    return {
      message: 'Assignment history endpoint - to be implemented',
      page,
      limit,
      adminId,
    };
  }
}
