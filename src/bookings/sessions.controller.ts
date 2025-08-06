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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionResponseDto } from './dto/session-response.dto';

@ApiTags('Sessions')
@Controller({ path: 'sessions', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new session',
    description: 'Book a session with a provider',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session created successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid session data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Provider not available or time conflict',
  })
  async create(
    @Body() createSessionDto: CreateSessionDto,
    @Req() req: any,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.createSession(createSessionDto, req.user.id);
  }

  @Get('my-sessions')
  @ApiOperation({
    summary: 'Get my sessions',
    description: 'Get sessions for the authenticated user (seeker or provider)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by session status',
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
    description: 'Sessions retrieved successfully',
    type: [SessionResponseDto],
  })
  async findMySessions(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (page - 1) * limit;

    // Check if user is seeker or provider and get appropriate sessions
    const seekerSessions = await this.sessionsService.findBySeeker(
      req.user.id,
      status,
      skip,
      limit,
    );

    const providerSessions = await this.sessionsService.findByProvider(
      req.user.id,
      status,
      skip,
      limit,
    );

    // Combine results
    return {
      asSeeker: seekerSessions,
      asProvider: providerSessions,
    };
  }

  @Get('seeker')
  @ApiOperation({
    summary: 'Get sessions as seeker',
    description: 'Get sessions where the authenticated user is the seeker',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by session status',
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
    description: 'Seeker sessions retrieved successfully',
  })
  async findSeekerSessions(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (page - 1) * limit;
    return this.sessionsService.findBySeeker(req.user.id, status, skip, limit);
  }

  @Get('provider')
  @ApiOperation({
    summary: 'Get sessions as provider',
    description: 'Get sessions where the authenticated user is the provider',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by session status',
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
    description: 'Provider sessions retrieved successfully',
  })
  async findProviderSessions(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (page - 1) * limit;
    return this.sessionsService.findByProvider(
      req.user.id,
      status,
      skip,
      limit,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get session by ID',
    description: 'Get session details by session ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session retrieved successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async findOne(@Param('id') id: string): Promise<SessionResponseDto> {
    return this.sessionsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update session',
    description: 'Update session details',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session updated successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to update this session',
  })
  async update(
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @Req() req: any,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.updateSession(
      id,
      updateSessionDto,
      req.user.id,
      req.user.role,
    );
  }

  @Put(':id/cancel')
  @ApiOperation({
    summary: 'Cancel session',
    description: 'Cancel a session',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session cancelled successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to cancel this session',
  })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Req() req?: any,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.cancelSession(id, req.user.id, reason);
  }
}
