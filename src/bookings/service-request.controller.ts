import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceRequestService } from './service-request.service';
import { ServiceRequestDto } from './dto/service-request.dto';
import { AvailableProvidersResponseDto } from './dto/available-providers-response.dto';

@ApiTags('Service Requests')
@Controller({ path: 'service-requests', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a service request',
    description:
      'Create a service request with specific requirements. Admin will assign a provider.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'Service request created successfully and sent to admin for assignment',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  async createServiceRequest(
    @Body() serviceRequestDto: ServiceRequestDto,
    @Request() req: any,
  ) {
    return this.serviceRequestService.createServiceRequest(
      serviceRequestDto,
      req.user.id,
    );
  }

  @Get('my-requests')
  @ApiOperation({
    summary: 'Get my service requests',
    description: 'Get all service requests created by the authenticated user',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by request status',
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
    description: 'Service requests retrieved successfully',
  })
  async getMyServiceRequests(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (page - 1) * limit;
    return this.serviceRequestService.getUserServiceRequests(
      req.user.id,
      status,
      skip,
      limit,
    );
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get service request status',
    description: 'Get the current status of a service request',
  })
  @ApiParam({
    name: 'id',
    description: 'Service request ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service request status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service request not found',
  })
  async getServiceRequestStatus(@Param('id') id: string) {
    return this.serviceRequestService.getServiceRequestStatus(id);
  }
}
