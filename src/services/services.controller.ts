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
} from '@nestjs/swagger';
import { ServicesService, ServiceFilters } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceCategory, CameroonProvince } from './schemas/service.schema';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new service (Provider only)',
    description: 'Allows providers to create a new service offering',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Service created successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request - Invalid service data',
  })
  async create(@Body() createServiceDto: CreateServiceDto, @Request() req) {
    return this.servicesService.create(
      createServiceDto,
      req.user.id,
      req.user.role,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all available services',
    description: 'Retrieve all active services with optional filtering',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ServiceCategory,
    description: 'Filter by service category',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    enum: CameroonProvince,
    description: 'Filter by Cameroon province',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price per hour in FCFA',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price per hour in FCFA',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in title, description, and tags',
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
    description: 'Services retrieved successfully',
  })
  async findAll(
    @Query('category') category?: ServiceCategory,
    @Query('location') location?: CameroonProvince,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const filters: ServiceFilters = {
      category,
      location,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      search,
    };

    const validatedLimit = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * validatedLimit;

    return this.servicesService.findAll(filters, skip, validatedLimit);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get all service categories',
    description: 'Retrieve list of all available service categories',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
  })
  async getCategories() {
    return {
      categories: await this.servicesService.getCategories(),
    };
  }

  @Get('my-services')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my services (Provider only)',
    description: 'Retrieve all services created by the authenticated provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'My services retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getMyServices(@Request() req) {
    return this.servicesService.findByProvider(req.user.id);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search services by location',
    description: 'Search for services in a specific Cameroon province',
  })
  @ApiQuery({
    name: 'location',
    required: true,
    enum: CameroonProvince,
    description: 'Cameroon province to search for services',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
  })
  async searchByLocation(
    @Query('location') location: CameroonProvince,
    @Query('limit') limit = 20,
  ) {
    return this.servicesService.searchByLocation(location, Number(limit));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get service by ID',
    description: 'Retrieve detailed information about a specific service',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service not found',
  })
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update service (Provider only)',
    description: 'Update a service (only by the provider who created it)',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Can only update your own services',
  })
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @Request() req,
  ) {
    return this.servicesService.update(
      id,
      updateServiceDto,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete service (Provider only)',
    description: 'Delete a service (only by the provider who created it)',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Can only delete your own services',
  })
  async remove(@Param('id') id: string, @Request() req) {
    await this.servicesService.remove(id, req.user.id, req.user.role);
    return { message: 'Service deleted successfully' };
  }

  @Get('providers/category/:category')
  @ApiOperation({
    summary: 'Get providers by category',
    description:
      'Retrieve all providers who offer services in a specific category',
  })
  @ApiParam({
    name: 'category',
    enum: ServiceCategory,
    description: 'Service category to filter providers by',
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
    description: 'Providers by category retrieved successfully',
  })
  async getProvidersByCategory(
    @Param('category') category: ServiceCategory,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const validatedLimit = Math.min(Number(limit), 50);
    const skip = (Number(page) - 1) * validatedLimit;

    return this.servicesService.findProvidersByCategory(
      category,
      skip,
      validatedLimit,
    );
  }
}
