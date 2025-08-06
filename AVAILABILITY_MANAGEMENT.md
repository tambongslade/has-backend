# Provider Availability Management Guide

## Overview
Providers can manage their availability by setting specific time slots for each day of the week. The system supports creating, viewing, updating, and deleting availability schedules.

## Authentication
All availability endpoints require JWT authentication. Include the bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Available Endpoints

### 1. Create Availability
**POST** `/bookings/availability`

Creates availability for a specific day of the week. Each provider can only have one availability record per day.

**Request Body:**
```json
{
  "dayOfWeek": "monday",
  "timeSlots": [
    {
      "startTime": "09:00",
      "endTime": "12:00",
      "isAvailable": true
    },
    {
      "startTime": "14:00",
      "endTime": "18:00",
      "isAvailable": true
    }
  ],
  "notes": "Available for emergency calls"
}
```

**Days of Week:** `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`

**Response:**
```json
{
  "_id": "64a1b2c3d4e5f6789012345",
  "providerId": "64a1b2c3d4e5f6789012346",
  "dayOfWeek": "monday",
  "timeSlots": [
    {
      "startTime": "09:00",
      "endTime": "12:00",
      "isAvailable": true
    },
    {
      "startTime": "14:00",
      "endTime": "18:00",
      "isAvailable": true
    }
  ],
  "isActive": true,
  "notes": "Available for emergency calls",
  "createdAt": "2024-12-15T10:30:00Z",
  "updatedAt": "2024-12-15T10:30:00Z"
}
```

### 2. Get My Availability Schedule
**GET** `/bookings/availability/my-schedule`

Returns the authenticated provider's complete availability schedule.

**Response:**
```json
[
  {
    "_id": "64a1b2c3d4e5f6789012345",
    "dayOfWeek": "monday",
    "timeSlots": [
      {
        "startTime": "09:00",
        "endTime": "12:00",
        "isAvailable": true
      }
    ],
    "isActive": true,
    "notes": "Available for emergency calls"
  },
  {
    "_id": "64a1b2c3d4e5f6789012346",
    "dayOfWeek": "tuesday",
    "timeSlots": [
      {
        "startTime": "10:00",
        "endTime": "16:00",
        "isAvailable": true
      }
    ],
    "isActive": true
  }
]
```

### 3. Get Any Provider's Availability (Public)
**GET** `/bookings/availability/provider/{providerId}`

Returns availability for any provider (used by seekers to see when providers are available).

### 4. Update Availability ✏️
**PATCH** `/bookings/availability/{availabilityId}`

Updates an existing availability record. You can modify time slots, notes, or activate/deactivate the availability.

**Request Body Examples:**

**Update Time Slots:**
```json
{
  "timeSlots": [
    {
      "startTime": "08:00",
      "endTime": "12:00",
      "isAvailable": true
    },
    {
      "startTime": "13:00",
      "endTime": "17:00",
      "isAvailable": true
    },
    {
      "startTime": "18:00",
      "endTime": "20:00",
      "isAvailable": false
    }
  ]
}
```

**Temporarily Disable Availability:**
```json
{
  "isActive": false,
  "notes": "On vacation until next week"
}
```

**Update Notes Only:**
```json
{
  "notes": "Updated contact information: +237123456789"
}
```

**Add New Time Slot:**
```json
{
  "timeSlots": [
    {
      "startTime": "09:00",
      "endTime": "12:00",
      "isAvailable": true
    },
    {
      "startTime": "14:00",
      "endTime": "18:00",
      "isAvailable": true
    },
    {
      "startTime": "19:00",
      "endTime": "21:00",
      "isAvailable": true
    }
  ],
  "notes": "Added evening hours"
}
```

### 5. Delete Availability ❌
**DELETE** `/bookings/availability/{availabilityId}`

Completely removes an availability record for a specific day.

**Response:**
```json
{
  "message": "Availability deleted successfully"
}
```

## Common Use Cases

### 1. Setting Up Weekly Schedule
```bash
# Monday
POST /bookings/availability
{
  "dayOfWeek": "monday",
  "timeSlots": [
    {"startTime": "09:00", "endTime": "17:00", "isAvailable": true}
  ]
}

# Tuesday
POST /bookings/availability
{
  "dayOfWeek": "tuesday",
  "timeSlots": [
    {"startTime": "09:00", "endTime": "17:00", "isAvailable": true}
  ]
}

# Continue for other days...
```

### 2. Updating Specific Day
```bash
# Get your schedule first
GET /bookings/availability/my-schedule

# Update Monday availability (use the _id from the response above)
PATCH /bookings/availability/64a1b2c3d4e5f6789012345
{
  "timeSlots": [
    {"startTime": "10:00", "endTime": "18:00", "isAvailable": true}
  ],
  "notes": "Updated Monday hours"
}
```

### 3. Temporarily Going Offline
```bash
# Disable all availability for a day
PATCH /bookings/availability/64a1b2c3d4e5f6789012345
{
  "isActive": false,
  "notes": "Sick leave - will be back tomorrow"
}

# Re-enable later
PATCH /bookings/availability/64a1b2c3d4e5f6789012345
{
  "isActive": true,
  "notes": "Back to normal schedule"
}
```

### 4. Removing a Day Completely
```bash
# Delete Tuesday availability entirely
DELETE /bookings/availability/64a1b2c3d4e5f6789012346
```

### 5. Complex Schedule with Breaks
```bash
POST /bookings/availability
{
  "dayOfWeek": "wednesday",
  "timeSlots": [
    {"startTime": "08:00", "endTime": "12:00", "isAvailable": true},
    {"startTime": "12:00", "endTime": "13:00", "isAvailable": false},
    {"startTime": "13:00", "endTime": "17:00", "isAvailable": true},
    {"startTime": "17:00", "endTime": "18:00", "isAvailable": false},
    {"startTime": "18:00", "endTime": "20:00", "isAvailable": true}
  ],
  "notes": "Lunch break 12-1pm, Dinner break 5-6pm"
}
```

## Important Notes

### Time Format
- All times must be in **24-hour format** (HH:mm)
- Examples: `"09:00"`, `"13:30"`, `"23:59"`

### Validation Rules
- Start time must be before end time
- Time slots can overlap (system will handle conflicts)
- You can only have **one availability record per day**
- Only the provider who created the availability can edit/delete it

### Booking Integration
- When seekers try to book, the system checks your availability
- Only time slots marked as `isAvailable: true` are bookable
- If `isActive: false`, the entire day is unavailable for booking

### Error Responses

**Conflict (409) - Day Already Exists:**
```json
{
  "statusCode": 409,
  "message": "Availability for monday already exists",
  "error": "Conflict"
}
```

**Not Found (404):**
```json
{
  "statusCode": 404,
  "message": "Availability not found",
  "error": "Not Found"
}
```

**Forbidden (403):**
```json
{
  "statusCode": 403,
  "message": "You can only update your own availability",
  "error": "Forbidden"
}
```

## Best Practices

1. **Set realistic schedules** - Don't overcommit your time
2. **Use notes effectively** - Add context for seekers
3. **Update regularly** - Keep your availability current
4. **Use isActive flag** - For temporary changes instead of deleting
5. **Plan breaks** - Mark unavailable slots for meals/rest

This system gives you complete control over when you're available for bookings!