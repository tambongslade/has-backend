import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/schemas/user.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user is admin (from admin auth) or has admin role
    if (user.isAdmin || user.role === 'admin') {
      return true;
    }

    // For development, also allow providers to access admin endpoints
    if (user.role === UserRole.PROVIDER) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}