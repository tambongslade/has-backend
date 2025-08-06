import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionConfigService } from './session-config.service';
import { ServiceCategory } from '../services/schemas/service.schema';
import { CategoryPricing } from './session-config.schema';

@ApiTags('Session Configuration')
@Controller({ path: 'admin/session-config', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SessionConfigController {
  constructor(private readonly sessionConfigService: SessionConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Get active session configuration',
    description:
      'Get the current active session configuration with all category pricing',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session configuration retrieved successfully',
  })
  async getActiveConfig() {
    return this.sessionConfigService.getActiveConfig();
  }

  @Get('category-pricing')
  @ApiOperation({
    summary: 'Get all category pricing',
    description: 'Get pricing configuration for all service categories',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category pricing retrieved successfully',
  })
  async getAllCategoryPricing() {
    return this.sessionConfigService.getAllCategoryPricing();
  }

  @Get('category-pricing/:category')
  @ApiOperation({
    summary: 'Get category pricing',
    description: 'Get pricing configuration for a specific service category',
  })
  @ApiParam({
    name: 'category',
    description: 'Service category',
    enum: ServiceCategory,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category pricing retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category pricing not found',
  })
  async getCategoryPricing(@Param('category') category: ServiceCategory) {
    return this.sessionConfigService.getCategoryPricing(category);
  }

  @Put('category-pricing/:category')
  @ApiOperation({
    summary: 'Update category pricing',
    description: 'Update pricing configuration for a specific service category',
  })
  @ApiParam({
    name: 'category',
    description: 'Service category',
    enum: ServiceCategory,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category pricing updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category pricing not found',
  })
  async updateCategoryPricing(
    @Param('category') category: ServiceCategory,
    @Body() pricing: Partial<CategoryPricing>,
  ) {
    return this.sessionConfigService.updateCategoryPricing(category, pricing);
  }

  @Get('calculate-price/:category/:duration')
  @ApiOperation({
    summary: 'Calculate session price',
    description:
      'Calculate the price for a session of given duration in a specific category',
  })
  @ApiParam({
    name: 'category',
    description: 'Service category',
    enum: ServiceCategory,
  })
  @ApiParam({
    name: 'duration',
    description: 'Session duration in hours',
    example: '5.5',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session price calculated successfully',
  })
  async calculateSessionPrice(
    @Param('category') category: ServiceCategory,
    @Param('duration') duration: string,
  ) {
    const durationHours = parseFloat(duration);
    return this.sessionConfigService.calculateSessionPrice(
      category,
      durationHours,
    );
  }
}
