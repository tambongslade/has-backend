import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateProviderReviewDto } from './dto/create-provider-review.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Return all users.',
    type: [User],
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('provider/all')
  @ApiOperation({
    summary: 'Get all service providers',
    description:
      'Retrieve all users with provider role, with optional filtering and search',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search providers by name, email, or phone',
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
    description: 'Providers retrieved successfully',
    type: [User],
  })
  async getProviders(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const validatedLimit = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * validatedLimit;

    return this.usersService.findProviders(search, skip, validatedLimit);
  }

  @Get('provider/:id/profile')
  @ApiOperation({
    summary: 'Get provider profile with details',
    description:
      'Get detailed provider profile including services and availability',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider profile retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider not found',
  })
  async getProviderProfile(@Param('id') id: string) {
    return this.usersService.getProviderProfile(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the user.',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully deleted.',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post('provider/:id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add review for provider',
    description: 'Add a rating and review for a specific provider',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider ID',
  })
  @ApiBody({
    type: CreateProviderReviewDto,
    description: 'Review details',
    examples: {
      example1: {
        summary: 'Provider review',
        value: {
          rating: 5,
          comment: 'Excellent provider! Very professional and reliable.',
          serviceCategory: 'cleaning',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review added successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot review yourself or duplicate review',
  })
  async addProviderReview(
    @Param('id') providerId: string,
    @Body() createReviewDto: CreateProviderReviewDto,
    @Request() req: any,
  ) {
    return this.usersService.addProviderReview(
      providerId,
      createReviewDto,
      req.user.id,
    );
  }

  @Get('provider/:id/reviews')
  @ApiOperation({
    summary: 'Get provider reviews',
    description: 'Retrieve all reviews for a specific provider with pagination',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider ID',
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
    description: 'Items per page (default: 10, max: 50)',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter reviews by service category',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider reviews retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider not found',
  })
  async getProviderReviews(
    @Param('id') providerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('category') category?: string,
  ) {
    const validatedLimit = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * validatedLimit;

    return this.usersService.getProviderReviews(
      providerId,
      skip,
      validatedLimit,
      category,
    );
  }

  @Post('provider/reviews/:reviewId/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add provider response to review',
    description: 'Allow providers to respond to reviews about their services',
  })
  @ApiParam({
    name: 'reviewId',
    description: 'Review ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          maxLength: 300,
          description: 'Provider response to the review',
        },
      },
      required: ['response'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Response added successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Can only respond to reviews for your services',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already responded to this review',
  })
  async addProviderResponse(
    @Param('reviewId') reviewId: string,
    @Body('response') response: string,
    @Request() req: any,
  ) {
    return this.usersService.addProviderResponse(
      reviewId,
      response,
      req.user.id,
    );
  }

  @Patch('provider/reviews/:reviewId/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update provider response to review',
    description: 'Allow providers to edit their response to reviews',
  })
  @ApiParam({
    name: 'reviewId',
    description: 'Review ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          maxLength: 300,
          description: 'Updated provider response',
        },
      },
      required: ['response'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response updated successfully',
  })
  async updateProviderResponse(
    @Param('reviewId') reviewId: string,
    @Body('response') response: string,
    @Request() req: any,
  ) {
    return this.usersService.updateProviderResponse(
      reviewId,
      response,
      req.user.id,
    );
  }

  @Get('provider/:id/statistics')
  @ApiOperation({
    summary: 'Get provider rating statistics',
    description: 'Get comprehensive rating statistics for a provider',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider not found',
  })
  async getProviderStatistics(@Param('id') providerId: string) {
    return this.usersService.getProviderStatistics(providerId);
  }
}
