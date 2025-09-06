# Availability Endpoints Documentation

This document provides comprehensive information about all availability endpoints for the new session-based booking system.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Data Models](#data-models)
- [Endpoints](#endpoints)
- [Integration with Sessions](#integration-with-sessions)
- [Examples](#examples)

## Overview

The availability system allows providers to set their weekly recurring schedules, which are then used by the session-based booking system to validate and create bookings. This system ensures that providers are only booked during their available times.

### Key Features
- Weekly recurring availability schedules
- Multiple time slots per day
- Real-time availability checking
- Integration with session booking system
- Public availability viewing

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Data Models

### DayOfWeek Enum
```typescript
enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY', 
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}
```

### TimeSlot Schema
```typescript
interface TimeSlot {
  startTime: string;    // Format: "HH:mm" (24-hour)
  endTime: string;      // Format: "HH:mm" (24-hour)
  isAvailable: boolean; // Default: true
}
```

### Availability Schema
```typescript
interface Availability {
  id: string;
  providerId: string;
  dayOfWeek: DayOfWeek;
  timeSlots: TimeSlot[];
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Endpoints

### 1. Create Availability Schedule

**Endpoint:** `POST /api/v1/availability`

**Purpose:** Create a new availability schedule for a specific day of the week

**Request Body:**
```json
{
  "dayOfWeek": "MONDAY",
  "timeSlots": [
    {
      "startTime": "09:00",
      "endTime": "12:00",
      "isAvailable": true
    },
    {
      "startTime": "14:00", 
      "endTime": "17:00",
      "isAvailable": true
    }
  ],
  "notes": "Available for morning and afternoon sessions"
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "providerId": "507f1f77bcf86cd799439012",
  "dayOfWeek": "MONDAY",
  "timeSlots": [
    {
      "startTime": "09:00",
      "endTime": "12:00", 
      "isAvailable": true
    },
    {
      "startTime": "14:00",
      "endTime": "17:00",
      "isAvailable": true
    }
  ],
  "isActive": true,
  "notes": "Available for morning and afternoon sessions",
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T10:00:00.000Z"
}
```

**Status Codes:**
- `201` - Availability created successfully
- `400` - Invalid availability data or already exists
- `401` - Unauthorized

---

### 2. Get My Availability Schedules

**Endpoint:** `GET /api/v1/availability`

**Purpose:** Get all availability schedules for the authenticated provider

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "providerId": "507f1f77bcf86cd799439012",
    "dayOfWeek": "MONDAY",
    "timeSlots": [
      {
        "startTime": "09:00",
        "endTime": "12:00",
        "isAvailable": true
      }
    ],
    "isActive": true,
    "notes": "Available for morning and afternoon sessions",
    "createdAt": "2025-01-06T10:00:00.000Z",
    "updatedAt": "2025-01-06T10:00:00.000Z"
  }
]
```

**Status Codes:**
- `200` - Availability schedules retrieved successfully
- `401` - Unauthorized

---

### 3. Get Provider Availability (Public)

**Endpoint:** `GET /api/v1/availability/provider/{providerId}`

**Purpose:** Get availability schedules for a specific provider (public endpoint)

**Parameters:**
- `providerId` (path, required): Provider's ID

**Example:**
```http
GET /api/v1/availability/provider/507f1f77bcf86cd799439012
```

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "providerId": "507f1f77bcf86cd799439012",
    "dayOfWeek": "MONDAY",
    "timeSlots": [
      {
        "startTime": "09:00",
        "endTime": "12:00",
        "isAvailable": true
      }
    ],
    "isActive": true,
    "notes": "Available for morning and afternoon sessions",
    "createdAt": "2025-01-06T10:00:00.000Z",
    "updatedAt": "2025-01-06T10:00:00.000Z"
  }
]
```

**Status Codes:**
- `200` - Provider availability retrieved successfully
- `404` - Provider not found

---

### 4. Check Availability

**Endpoint:** `GET /api/v1/availability/check`

**Purpose:** Check if a provider is available at a specific date and time

**Query Parameters:**
- `providerId` (required): Provider ID
- `date` (required): Date in YYYY-MM-DD format
- `startTime` (required): Start time in HH:mm format
- `endTime` (required): End time in HH:mm format

**Example:**
```http
GET /api/v1/availability/check?providerId=507f1f77bcf86cd799439012&date=2025-08-06&startTime=10:00&endTime=14:00
```

**Response:**
```json
{
  "available": true,
  "providerId": "507f1f77bcf86cd799439012",
  "date": "2025-08-06",
  "startTime": "10:00",
  "endTime": "14:00"
}
```

**Status Codes:**
- `200` - Availability check completed
- `400` - Invalid parameters

---

### 5. Update Availability Schedule

**Endpoint:** `PUT /api/v1/availability/{id}`

**Purpose:** Update an existing availability schedule

**Parameters:**
- `id` (path, required): Availability schedule ID

**Request Body:**
```json
{
  "dayOfWeek": "MONDAY",
  "timeSlots": [
    {
      "startTime": "08:00",
      "endTime": "18:00",
      "isAvailable": true
    }
  ],
  "isActive": true,
  "notes": "Updated to full day availability"
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "providerId": "507f1f77bcf86cd799439012",
  "dayOfWeek": "MONDAY",
  "timeSlots": [
    {
      "startTime": "08:00",
      "endTime": "18:00",
      "isAvailable": true
    }
  ],
  "isActive": true,
  "notes": "Updated to full day availability",
  "createdAt": "2025-01-06T10:00:00.000Z",
  "updatedAt": "2025-01-06T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Availability updated successfully
- `404` - Availability not found
- `401` - Unauthorized

---

### 6. Delete Availability Schedule

**Endpoint:** `DELETE /api/v1/availability/{id}`

**Purpose:** Delete an availability schedule

**Parameters:**
- `id` (path, required): Availability schedule ID

**Response:**
```json
{
  "message": "Availability deleted successfully"
}
```

**Status Codes:**
- `200` - Availability deleted successfully
- `404` - Availability not found
- `401` - Unauthorized

---

### 7. Set Default Availability

**Endpoint:** `POST /api/v1/availability/default`

**Purpose:** Quickly set default Monday-Friday 9-5 availability

**Response:**
```json
{
  "message": "Default availability set successfully"
}
```

**Status Codes:**
- `201` - Default availability set successfully
- `401` - Unauthorized

## Integration with Sessions

The availability system is fully integrated with the new session-based booking system:

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

### Setting Up Weekly Availability

```bash
# Monday availability
curl -X POST http://localhost:3000/api/v1/availability \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": "MONDAY",
    "timeSlots": [
      {"startTime": "09:00", "endTime": "12:00", "isAvailable": true},
      {"startTime": "14:00", "endTime": "17:00", "isAvailable": true}
    ],
    "notes": "Morning and afternoon sessions"
  }'

# Tuesday availability
curl -X POST http://localhost:3000/api/v1/availability \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": "TUESDAY",
    "timeSlots": [
      {"startTime": "08:00", "endTime": "16:00", "isAvailable": true}
    ],
    "notes": "Full day availability"
  }'
```

### Checking Availability

```bash
# Check if provider is available
curl -X GET "http://localhost:3000/api/v1/availability/check?providerId=507f1f77bcf86cd799439012&date=2025-08-06&startTime=10:00&endTime=14:00"
```

### Quick Setup with Default Availability

```bash
# Set default Monday-Friday 9-5 availability
curl -X POST http://localhost:3000/api/v1/availability/default \
  -H "Authorization: Bearer <token>"
```

## Error Handling

### Common Error Responses

```json
// 400 Bad Request
{
  "statusCode": 400,
  "message": "Invalid availability data",
  "error": "Bad Request"
}

// 401 Unauthorized
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "Availability not found",
  "error": "Not Found"
}

// 409 Conflict
{
  "statusCode": 409,
  "message": "Availability already exists for this day",
  "error": "Conflict"
}
```

## Best Practices

1. **Time Format**: Always use 24-hour format (HH:mm) for time values
2. **Time Slots**: Ensure end time is after start time
3. **Overlapping**: Avoid overlapping time slots for the same day
4. **Active Status**: Use `isActive` to temporarily disable availability without deleting
5. **Notes**: Use notes field to provide additional context about availability
6. **Default Setup**: Use the default endpoint for quick initial setup

## Database Schema

### Availability Collection
```typescript
{
  _id: ObjectId,
  providerId: ObjectId, // Reference to User
  dayOfWeek: String,    // DayOfWeek enum
  timeSlots: [{
    startTime: String,  // "HH:mm"
    endTime: String,    // "HH:mm"
    isAvailable: Boolean
  }],
  isActive: Boolean,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

**Note:** This availability system is fully integrated with the new session-based booking system and replaces the legacy booking system. All endpoints are production-ready and include comprehensive error handling and validation.
