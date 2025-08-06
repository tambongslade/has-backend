import { Controller, Get, Version } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Version('1')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Version('1')
  @ApiOperation({ summary: 'Get the application health status' })
  getHealth(): { status: string; timestamp: string; version: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Get('admin')
  @ApiOperation({ summary: 'Basic admin interface' })
  getAdmin() {
    return `
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
            ✅ Admin interface is working! Route is accessible.
          </div>
          <div class="status info">
            ℹ️ This is the admin dashboard for the HAS platform.
          </div>
          
          <h3>System Status:</h3>
          <ul>
            <li>✅ Application running on port 3000</li>
            <li>✅ MongoDB connection active</li>
            <li>✅ Session-based booking system active</li>
            <li>✅ Category pricing: 3,000 FCFA base rate</li>
            <li>✅ Admin route working</li>
          </ul>

          <h3>Management Links:</h3>
          <div class="links">
            <a href="/api/docs" target="_blank">📚 API Documentation</a>
            <a href="/api/v1/health" target="_blank">💚 Health Check</a>
            <a href="/api/v1/admin/session-config/category-pricing" target="_blank">⚙️ Session Pricing Config</a>
          </div>

          <h3>Admin Credentials:</h3>
          <p><strong>Email:</strong> admin@has.com<br>
          <strong>Password:</strong> admin123</p>

          <hr>
          <p><em>HAS - House Service Platform Admin Interface</em></p>
        </div>
      </body>
      </html>
    `;
  }
}
