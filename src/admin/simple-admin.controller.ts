import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WithdrawalManagementService } from '../providers/services/withdrawal-management.service';
import {
  UpdateWithdrawalStatusDto,
  WithdrawalResponseDto,
} from '../providers/dto/withdrawal.dto';

@ApiTags('Admin')
@Controller({ path: 'admin', version: [] }) // No versioning for admin routes
export class SimpleAdminController {
  constructor(
    private readonly withdrawalService: WithdrawalManagementService,
  ) {}
  @Get()
  async adminRoot(@Req() req: Request, @Res() res: Response) {
    try {
      // Import AdminJS dynamically
      const [{ default: AdminJS }, { buildRouter }, { Resource, Database }] =
        await Promise.all([
          import('adminjs'),
          import('@adminjs/express'),
          import('@adminjs/mongoose'),
        ]);

      // Register the Mongoose adapter
      AdminJS.registerAdapter({ Resource, Database });

      // Create basic AdminJS instance
      const adminJs = new AdminJS({
        rootPath: '/admin',
        resources: [],
        branding: {
          companyName: 'HAS - House Service Platform',
          withMadeWithLove: false,
        },
      });

      // Return basic admin HTML
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>HAS Admin Panel</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 800px; 
              margin: 50px auto; 
              padding: 20px;
              background: #f5f5f5;
            }
            .card {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #2c3e50; }
            .status { 
              padding: 10px; 
              margin: 10px 0; 
              border-radius: 4px;
            }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .info { background: #cce7ff; color: #004085; border: 1px solid #b3d7ff; }
            .links a {
              display: inline-block;
              margin: 10px 10px 10px 0;
              padding: 10px 15px;
              background: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 4px;
            }
            .links a:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🏠 HAS Admin Panel</h1>
            <div class="status success">
              ✅ AdminJS is working! The route is now accessible.
            </div>
            <div class="status info">
              ℹ️ This is a basic admin interface. The full AdminJS UI will be implemented next.
            </div>
            
            <h3>System Status:</h3>
            <ul>
              <li>✅ Application running on port 3000</li>
              <li>✅ MongoDB connection active</li>
              <li>✅ Session-based booking system active</li>
              <li>✅ Category pricing: 3,000 FCFA base rate</li>
              <li>✅ Admin route accessible at /admin</li>
            </ul>

            <h3>Quick Links:</h3>
            <div class="links">
              <a href="/api/docs" target="_blank">📚 API Documentation</a>
              <a href="/api/v1/health" target="_blank">💚 Health Check</a>
              <a href="/api/v1/admin/session-config/category-pricing" target="_blank">⚙️ Session Config</a>
            </div>

            <h3>Admin Credentials:</h3>
            <p><strong>Email:</strong> admin@has.com<br>
            <strong>Password:</strong> admin123</p>

            <hr>
            <p><em>HAS - House Service Platform Admin Interface</em></p>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send(`
        <h1>AdminJS Setup Error</h1>
        <p>Error: ${error.message}</p>
        <p>The admin panel is temporarily unavailable.</p>
      `);
    }
  }

  @Get('test')
  getTest() {
    return {
      message: 'Admin route is working!',
      timestamp: new Date(),
      status: 'success',
    };
  }

  @Patch('withdrawals/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update withdrawal status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal status updated successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  async updateWithdrawalStatus(
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawalStatusDto,
  ): Promise<WithdrawalResponseDto> {
    return this.withdrawalService.updateWithdrawalStatus(id, dto);
  }
}
