# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **HAS (House Service) Backend** - a NestJS-based RESTful API for a service marketplace where providers offer home services and seekers can book them. The platform handles authentication, service management, booking system, availability scheduling, and wallet/payment processing.

## Tech Stack

- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with Passport.js
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest (unit tests + e2e)
- **Code Quality**: ESLint + Prettier
- **Currency**: FCFA (Central African CFA franc)

## Development Commands

### Essential Commands
- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Run production build
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage report

### Single Test Execution
- `npm run test -- auth.service.spec.ts` - Run specific test file
- `npm run test:debug` - Debug tests with Node inspector

## Application Architecture

### Core Modules Structure
```
src/
├── auth/           # Authentication & authorization (JWT, roles)
├── users/          # User management (Provider/Seeker profiles)
├── services/       # Service catalog management
├── bookings/       # Booking system + availability management
├── wallet/         # Payment processing & earnings
└── common/         # Shared utilities & interceptors
```

### Key Domain Concepts

**User Roles:**
- `SEEKER` - Books services from providers
- `PROVIDER` - Offers services and manages availability

**Booking Workflow:**
`pending` → `confirmed` → `in_progress` → `completed` (or `cancelled`)

**Payment Flow:**
- Automatic earnings processing when bookings complete
- 10% platform commission deducted
- Withdrawal system for providers

### Database Schema Relationships
- Users (Seekers/Providers) → Services (1:many)
- Services → Bookings (1:many)
- Providers → Availability schedules (1:many by day)
- Providers → Wallets (1:1)
- Bookings → Transactions (1:many)

## Environment Configuration

Required environment variables:
```env
MONGODB_URI=mongodb://localhost:27017/house_service_db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3000
```

## API Features

### Authentication
- JWT-based authentication with role-based access
- Protected routes using `@UseGuards(JwtAuthGuard)`
- Role validation for Provider/Seeker specific endpoints

### API Versioning
- URI versioning enabled (`/api/v1/`)
- Swagger documentation at `/api/docs`

### Validation & DTOs
- Global validation pipeline with `class-validator`
- DTOs for request/response validation
- Transform and whitelist enabled

### Logging
- Winston logger integration via `nest-winston`
- Global logging interceptor for request/response tracking

## Testing Strategy

### Unit Tests
- Located alongside source files (`.spec.ts`)
- Focus on service logic and business rules
- Mock external dependencies

### E2E Tests
- Located in `/test/` directory
- Test complete API workflows
- Use separate test database

### Example Test Command
```bash
# Run specific service tests
npm run test -- --testPathPattern=wallet.service.spec.ts

# Run tests with coverage for specific module
npm run test:cov -- --testPathPattern=auth/
```

## Development Guidelines

### Code Style
- ESLint configuration with TypeScript rules
- Prettier formatting (single quotes, trailing commas)
- Strict null checks enabled in TypeScript

### Database Operations
- Use Mongoose schemas with proper typing
- Implement proper indexing for performance
- Handle database connection errors gracefully

### Error Handling
- Global exception filters
- Standardized error response format
- Proper HTTP status codes

### Security
- Bcrypt for password hashing
- JWT token validation
- Input validation and sanitization
- Role-based access control

## Common Development Tasks

### Adding New Module
1. Generate module: `nest g module feature-name`
2. Generate service: `nest g service feature-name`
3. Generate controller: `nest g controller feature-name`
4. Add DTOs and schemas
5. Import in app.module.ts
6. Add tests

### Database Schema Changes
1. Update Mongoose schema
2. Create/update DTOs
3. Update validation rules
4. Run tests to ensure compatibility
5. Update API documentation

### Testing New Features
1. Write unit tests for services
2. Add e2e tests for complete workflows
3. Test with different user roles
4. Verify error handling scenarios

## Debugging

### Local Development
- Server runs on `http://localhost:3000`
- Swagger docs at `http://localhost:3000/api/docs`
- Health check at `http://localhost:3000/api/v1/health`

### Database Debugging
- Check MongoDB connection status
- Use Mongoose debug mode for query logging
- Verify indexes are created properly

## Business Logic Notes

### Service Categories
Available categories: cleaning, plumbing, electrical, painting, gardening, carpentry, cooking, tutoring, beauty, maintenance, other

### Booking Validation
- Services have min/max booking hour limits
- Availability checking prevents double-bookings
- Time slot validation in 24-hour format

### Wallet System
- Automatic earnings processing
- Commission calculation (10% platform fee)
- Withdrawal request handling
- Transaction history tracking

### Availability Management
- Weekly recurring schedules
- Time slot granularity
- Provider-specific availability
- Real-time booking conflict prevention