# Session Endpoints Documentation

This document provides comprehensive information about all session endpoints for the new session-based booking system.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Data Models](#data-models)
- [Session Endpoints](#session-endpoints)
- [Service Request Endpoints](#service-request-endpoints)
- [Integration with Availability](#integration-with-availability)
- [Examples](#examples)

## Overview

The session system is the core of the new booking system, replacing the legacy booking system. It handles both direct provider bookings and admin-assigned service requests.

### Key Features
- Direct booking with specific providers
- Admin-assigned service requests
- Real-time availability checking
- Payment integration
- Status tracking and management
- Location tracking support

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Data Models

### SessionStatus Enum
```typescript
enum SessionStatus {
  PENDING_ASSIGNMENT = 'pending_assignment',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}
```

### PaymentStatus Enum
```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}
```

### Session Schema
```typescript
interface Session {
  id: string;
  seekerId: string;
  providerId?: string; // Optional - assigned by admin
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  sessionDate: Date;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  baseDuration: number; // hours
  overtimeHours: number;
  basePrice: number; // FCFA
  overtimePrice: number; // FCFA
  totalAmount: number; // FCFA
  currency: string;
  status: SessionStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  cancellationReason?: string;
  seekerRating?: number;
  seekerReview?: string;
  providerRating?: number;
  providerReview?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Session Endpoints

### 1. Create Session

**Endpoint:** `POST /api/v1/sessions`

**Purpose:** Book a session with a specific provider

**Request Body:**
```json
{
  "serviceId": "507f1f77bcf86cd799439011",
  "sessionDate": "2025-08-06",
  "startTime": "09:00",
  "duration": 4.5,
  "notes": "Please bring cleaning supplies"
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439015",
  "seekerId": "507f1f77bcf86cd799439012",
  "providerId": "507f1f77bcf86cd799439013",
  "serviceId": "507f1f77bcf86cd799439011",
  "serviceName": "House Cleaning Service",
  "category": "CLEANING",
  "sessionDate": "2025-08-06T00:00:00.000Z",
  "startTime": "09:00",
  "endTime": "13:30",
  "baseDuration": 4,
  "overtimeHours": 0.5,
  "basePrice": 8000,
  "overtimePrice": 1500,
  "totalAmount": 9500,
  "currency": "FCFA",
  "status": "PENDING_ASSIGNMENT",
  "paymentStatus": "PENDING",
  "notes": "Please bring cleaning supplies",
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T10:00:00.000Z"
}
```

**Status Codes:**
- `201` - Session created successfully
- `400` - Invalid session data
- `409` - Provider not available or time conflict
- `401` - Unauthorized

---

### 2. Get My Sessions

**Endpoint:** `GET /api/v1/sessions/my-sessions`

**Purpose:** Get all sessions for the authenticated user (both as seeker and provider)

**Query Parameters:**
- `status` (optional): Filter by session status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "asSeeker": {
    "sessions": [...],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  },
  "asProvider": {
    "sessions": [...],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Sessions as Seeker

**Endpoint:** `GET /api/v1/sessions/seeker`

**Purpose:** Get sessions where the authenticated user is the seeker

**Query Parameters:**
- `status` (optional): Filter by session status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "sessions": [
    {
      "id": "507f1f77bcf86cd799439015",
      "seekerId": "507f1f77bcf86cd799439012",
      "providerId": "507f1f77bcf86cd799439013",
      "serviceName": "House Cleaning Service",
      "category": "CLEANING",
      "sessionDate": "2025-08-06T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "13:30",
      "status": "CONFIRMED",
      "paymentStatus": "PAID",
      "totalAmount": 9500
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 4. Get Sessions as Provider

**Endpoint:** `GET /api/v1/sessions/provider`

**Purpose:** Get sessions where the authenticated user is the provider

**Query Parameters:**
- `status` (optional): Filter by session status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** Same format as seeker sessions

---

### 5. Get Session by ID

**Endpoint:** `GET /api/v1/sessions/{id}`

**Purpose:** Get detailed information about a specific session

**Parameters:**
- `id` (path, required): Session ID

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439015",
  "seekerId": "507f1f77bcf86cd799439012",
  "providerId": "507f1f77bcf86cd799439013",
  "serviceId": "507f1f77bcf86cd799439011",
  "serviceName": "House Cleaning Service",
  "category": "CLEANING",
  "sessionDate": "2025-08-06T00:00:00.000Z",
  "startTime": "09:00",
  "endTime": "13:30",
  "baseDuration": 4,
  "overtimeHours": 0.5,
  "basePrice": 8000,
  "overtimePrice": 1500,
  "totalAmount": 9500,
  "currency": "FCFA",
  "status": "CONFIRMED",
  "paymentStatus": "PAID",
  "notes": "Please bring cleaning supplies",
  "seekerRating": 5,
  "seekerReview": "Excellent service!",
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T10:00:00.000Z"
}
```

**Status Codes:**
- `200` - Session retrieved successfully
- `404` - Session not found
- `401` - Unauthorized

---

### 6. Update Session

**Endpoint:** `PUT /api/v1/sessions/{id}`

**Purpose:** Update session details (admin or authorized users only)

**Parameters:**
- `id` (path, required): Session ID

**Request Body:**
```json
{
  "notes": "Updated notes for the session",
  "overtimeHours": 1.0
}
```

**Response:** Updated session object

**Status Codes:**
- `200` - Session updated successfully
- `404` - Session not found
- `403` - Not authorized to update this session
- `401` - Unauthorized

---

### 7. Cancel Session

**Endpoint:** `PUT /api/v1/sessions/{id}/cancel`

**Purpose:** Cancel a session

**Parameters:**
- `id` (path, required): Session ID

**Request Body:**
```json
{
  "reason": "Weather conditions"
}
```

**Response:** Updated session object with status "CANCELLED"

**Status Codes:**
- `200` - Session cancelled successfully
- `404` - Session not found
- `403` - Not authorized to cancel this session
- `401` - Unauthorized

## Service Request Endpoints

### 1. Create Service Request

**Endpoint:** `POST /api/v1/service-requests`

**Purpose:** Create a service request for admin assignment (for generic services)

**Request Body:**
```json
{
  "category": "CLEANING",
  "serviceDate": "2025-08-06",
  "startTime": "10:00",
  "duration": 3,
  "location": {
    "latitude": 4.0511,
    "longitude": 9.7679,
    "address": "Douala, Cameroon"
  },
  "province": "Littoral",
  "specialInstructions": "Deep cleaning required",
  "description": "House cleaning for 3-bedroom apartment"
}
```

**Response:**
```json
{
  "message": "Service request created successfully and sent to admin for assignment",
  "requestId": "507f1f77bcf86cd799439016",
  "estimatedCost": 12000
}
```

**Status Codes:**
- `201` - Service request created successfully
- `400` - Invalid request data
- `401` - Unauthorized

---

### 2. Get My Service Requests

**Endpoint:** `GET /api/v1/service-requests/my-requests`

**Purpose:** Get all service requests created by the authenticated user

**Query Parameters:**
- `status` (optional): Filter by request status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "requests": [
    {
      "requestId": "507f1f77bcf86cd799439016",
      "status": "PENDING_ASSIGNMENT",
      "category": "CLEANING",
      "serviceDate": "2025-08-06T00:00:00.000Z",
      "startTime": "10:00",
      "endTime": "13:00",
      "duration": 3,
      "totalAmount": 12000,
      "serviceLocation": "Littoral",
      "serviceAddress": "Douala, Cameroon",
      "notes": "Deep cleaning required",
      "seeker": {...},
      "provider": null,
      "assignedAt": null,
      "createdAt": "2025-01-06T10:00:00.000Z",
      "updatedAt": "2025-01-06T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 3. Get Service Request Status

**Endpoint:** `GET /api/v1/service-requests/{id}/status`

**Purpose:** Get the current status of a service request

**Parameters:**
- `id` (path, required): Service request ID

**Response:**
```json
{
  "requestId": "507f1f77bcf86cd799439016",
  "status": "CONFIRMED",
  "category": "CLEANING",
  "serviceDate": "2025-08-06T00:00:00.000Z",
  "startTime": "10:00",
  "endTime": "13:00",
  "duration": 3,
  "totalAmount": 12000,
  "serviceLocation": "Littoral",
  "serviceAddress": "Douala, Cameroon",
  "notes": "Deep cleaning required",
  "seeker": {...},
  "provider": {...},
  "assignedAt": "2025-01-06T11:00:00.000Z",
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T11:00:00.000Z"
}
```

**Status Codes:**
- `200` - Service request status retrieved successfully
- `404` - Service request not found
- `401` - Unauthorized

## Integration with Availability

The session system is fully integrated with the availability system:

### Session Creation Flow
1. **Service Validation** - Check if service exists and is available
2. **Availability Check** - Verify provider is available at requested time
3. **Conflict Check** - Ensure no existing sessions conflict
4. **Session Creation** - Create session if all checks pass

### Code Example
```typescript
// Check provider availability
const isProviderAvailable = await this.availabilityService.isAvailable(
  service.providerId.toString(),
  new Date(createSessionDto.sessionDate),
  startTime,
  endTime,
);

if (!isProviderAvailable) {
  throw new ConflictException('Provider is not available at the requested time');
}
```

## Examples

### Creating a Direct Session

```bash
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "507f1f77bcf86cd799439011",
    "sessionDate": "2025-08-06",
    "startTime": "09:00",
    "duration": 4.5,
    "notes": "Please bring cleaning supplies"
  }'
```

### Creating a Service Request

```bash
curl -X POST http://localhost:3000/api/v1/service-requests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "CLEANING",
    "serviceDate": "2025-08-06",
    "startTime": "10:00",
    "duration": 3,
    "location": {
      "latitude": 4.0511,
      "longitude": 9.7679,
      "address": "Douala, Cameroon"
    },
    "province": "Littoral",
    "specialInstructions": "Deep cleaning required"
  }'
```

### Getting My Sessions

```bash
# Get all my sessions
curl -X GET "http://localhost:3000/api/v1/sessions/my-sessions" \
  -H "Authorization: Bearer <token>"

# Get sessions with status filter
curl -X GET "http://localhost:3000/api/v1/sessions/my-sessions?status=CONFIRMED" \
  -H "Authorization: Bearer <token>"
```

### Canceling a Session

```bash
curl -X PUT http://localhost:3000/api/v1/sessions/507f1f77bcf86cd799439015/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Weather conditions"
  }'
```

## Error Handling

### Common Error Responses

```json
// 400 Bad Request
{
  "statusCode": 400,
  "message": "Invalid session data",
  "error": "Bad Request"
}

// 401 Unauthorized
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}

// 403 Forbidden
{
  "statusCode": 403,
  "message": "Not authorized to update this session",
  "error": "Forbidden"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "Session not found",
  "error": "Not Found"
}

// 409 Conflict
{
  "statusCode": 409,
  "message": "Provider is not available at the requested time",
  "error": "Conflict"
}
```

## Best Practices

1. **Time Format**: Always use 24-hour format (HH:mm) for time values
2. **Duration**: Use decimal values for partial hours (e.g., 2.5 for 2 hours 30 minutes)
3. **Status Management**: Use appropriate status transitions
4. **Payment Integration**: Sessions integrate with the payment system
5. **Location Data**: Provide accurate location information for service requests
6. **Notes**: Use notes field for special instructions or requirements

## Database Schema

### Session Collection
```typescript
{
  _id: ObjectId,
  seekerId: ObjectId, // Reference to User
  providerId: ObjectId, // Reference to User (optional)
  serviceId: ObjectId, // Reference to Service
  serviceName: String,
  category: String, // ServiceCategory enum
  sessionDate: Date,
  startTime: String, // "HH:mm"
  endTime: String, // "HH:mm"
  baseDuration: Number,
  overtimeHours: Number,
  basePrice: Number,
  overtimePrice: Number,
  totalAmount: Number,
  currency: String,
  status: String, // SessionStatus enum
  paymentStatus: String, // PaymentStatus enum
  notes: String,
  cancellationReason: String,
  seekerRating: Number,
  seekerReview: String,
  providerRating: Number,
  providerReview: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Session vs Service Request

| Feature | Session | Service Request |
|---------|---------|-----------------|
| **Provider** | Pre-selected | Admin-assigned |
| **Availability Check** | Yes | No |
| **Immediate Booking** | Yes | No |
| **Use Case** | Direct provider booking | Generic service needs |
| **Status** | Starts as PENDING_ASSIGNMENT | Starts as PENDING_ASSIGNMENT |

---

**Note:** This session system has completely replaced the legacy booking system and is fully integrated with availability, payment, and wallet systems. All endpoints are production-ready and include comprehensive error handling and validation.

