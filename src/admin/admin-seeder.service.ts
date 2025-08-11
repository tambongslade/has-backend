import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class AdminSeederService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(private readonly adminAuthService: AdminAuthService) {}

  async onModuleInit() {
    this.logger.log('Initializing admin seeder...');
    await this.seedDefaultAdmin();
  }

  private async seedDefaultAdmin() {
    try {
      await this.adminAuthService.ensureDefaultAdmin();
      this.logger.log('Admin seeding completed successfully');
    } catch (error) {
      this.logger.error('Failed to seed admin account:', error.message);
    }
  }
}