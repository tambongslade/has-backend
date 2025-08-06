# Frontend API Integration Guide
## Session-Based Booking System with Category Pricing

### Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Session Management](#session-management)
4. [Availability Management](#availability-management)
5. [Payment Integration](#payment-integration)
6. [Pricing System](#pricing-system)
7. [User Flows](#user-flows)
8. [Error Handling](#error-handling)

---

## Overview

The HAS backend has been redesigned with a **session-based booking system** that uses **category-based pricing**. Key changes:

- **Sessions replace bookings**: 4-hour base sessions with overtime billing
- **Uniform pricing**: All categories cost 3,000 FCFA for 4 hours
- **Weekly availability**: Providers set recurring weekly schedules
- **Automatic pricing**: No provider-set prices, system-controlled rates

---

## Authentication

All API calls require JWT authentication in the header:
```http
Authorization: Bearer <jwt_token>
```

Base URL: `http://localhost:3000/api/v1`

---

## Session Management

### 1. Create Session (Book a Service)

**Endpoint:** `POST /sessions`

**Request Body:**
```json
{
  "serviceId": "507f1f77bcf86cd799439011",
  "sessionDate": "2025-08-06",
  "startTime": "09:00",
  "duration": 5.5,
  "notes": "Please bring cleaning supplies"
}
```

**Response:** 
```json
{
  "id": "507f1f77bcf86cd799439011",
  "seekerId": "507f1f77bcf86cd799439012",
  "providerId": "507f1f77bcf86cd799439013",
  "serviceId": "507f1f77bcf86cd799439014",
  "serviceName": "House Cleaning Service",
  "category": "cleaning",
  "sessionDate": "2025-08-06T00:00:00.000Z",
  "startTime": "09:00",
  "endTime": "14:30",
  "baseDuration": 4,
  "overtimeHours": 1.5,
  "basePrice": 3000,
  "overtimePrice": 1125,
  "totalAmount": 4125,
  "currency": "FCFA",
  "status": "pending",
  "paymentStatus": "pending",
  "notes": "Please bring cleaning supplies",
  "createdAt": "2025-08-05T10:30:00.000Z",
  "updatedAt": "2025-08-05T10:30:00.000Z"
}
```

### 2. Get My Sessions

**Endpoint:** `GET /sessions/my-sessions?status=pending&page=1&limit=20`

**Response:**
```json
{
  "asSeeker": {
    "sessions": [...],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    },
    "summary": {
      "pending": 3,
      "confirmed": 5,
      "inProgress": 1,
      "completed": 6,
      "cancelled": 0,
      "rejected": 0,
      "totalEarnings": 0
    }
  },
  "asProvider": {
    "sessions": [...],
    "pagination": {...},
    "summary": {
      "pending": 2,
      "confirmed": 4,
      "inProgress": 1,
      "completed": 8,
      "cancelled": 1,
      "rejected": 0,
      "totalEarnings": 45000
    }
  }
}
```

### 3. Get Sessions as Seeker

**Endpoint:** `GET /sessions/seeker?status=pending&page=1&limit=20`

### 4. Get Sessions as Provider

**Endpoint:** `GET /sessions/provider?status=confirmed&page=1&limit=20`

### 5. Get Session Details

**Endpoint:** `GET /sessions/{sessionId}`

### 6. Update Session

**Endpoint:** `PUT /sessions/{sessionId}`

**Request Body:**
```json
{
  "status": "confirmed",
  "duration": 6.0,
  "notes": "Updated requirements"
}
```

### 7. Cancel Session

**Endpoint:** `PUT /sessions/{sessionId}/cancel`

**Request Body:**
```json
{
  "reason": "Weather conditions"
}
```

---

## Availability Management

### 1. Create Weekly Availability

**Endpoint:** `POST /availability`

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

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "providerId": "507f1f77bcf86cd799439012",
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
  "createdAt": "2025-08-05T10:30:00.000Z",
  "updatedAt": "2025-08-05T10:30:00.000Z"
}
```

### 2. Get My Availability

**Endpoint:** `GET /availability`

### 3. Get Provider Availability (Public)

**Endpoint:** `GET /availability/provider/{providerId}`

### 4. Check Availability

**Endpoint:** `GET /availability/check?providerId={id}&date=2025-08-06&startTime=10:00&endTime=14:00`

**Response:**
```json
{
  "available": true,
  "providerId": "507f1f77bcf86cd799439011",
  "date": "2025-08-06",
  "startTime": "10:00",
  "endTime": "14:00"
}
```

### 5. Update Availability

**Endpoint:** `PUT /availability/{availabilityId}`

### 6. Set Default Availability

**Endpoint:** `POST /availability/default`

Sets Monday-Friday 9-5 availability for the provider.

---

## Payment Integration

### Session Status Flow:
`pending` → `confirmed` → `in_progress` → `completed`

### Payment Status Flow:
`pending` → `paid` → (optional: `refunded`)

### Key Payment Endpoints:

1. **Get Payment Info:** `GET /sessions/{sessionId}` (check `paymentStatus` and `totalAmount`)
2. **Update Payment Status:** Done through payment gateway webhooks
3. **Payment Required:** When `status: "confirmed"` and `paymentStatus: "pending"`

---

## Pricing System

### 1. Get Category Pricing

**Endpoint:** `GET /admin/session-config/category-pricing`

**Response:**
```json
[
  {
    "category": "cleaning",
    "baseSessionPrice": 3000,
    "baseSessionDuration": 4,
    "overtimeRate": 375,
    "overtimeIncrement": 30
  },
  {
    "category": "plumbing",
    "baseSessionPrice": 3000,
    "baseSessionDuration": 4,
    "overtimeRate": 375,
    "overtimeIncrement": 30
  }
]
```

### 2. Calculate Session Price

**Endpoint:** `GET /admin/session-config/calculate-price/{category}/{duration}`

**Example:** `GET /admin/session-config/calculate-price/cleaning/5.5`

**Response:**
```json
{
  "basePrice": 3000,
  "overtimePrice": 1125,
  "totalPrice": 4125,
  "baseDuration": 4,
  "overtimeHours": 1.5
}
```

### Pricing Logic:
- **Base Session**: 3,000 FCFA for 4 hours (all categories)
- **Overtime**: 375 FCFA per 30-minute block
- **Examples**:
  - 3 hours = 3,000 FCFA
  - 4 hours = 3,000 FCFA
  - 5 hours = 3,000 + 750 = 3,750 FCFA
  - 6 hours = 3,000 + 1,500 = 4,500 FCFA

---

## User Flows

### For Seekers (Booking a Session):

1. **Browse Services**: Get services by category/location
2. **Check Provider Availability**: `GET /availability/provider/{providerId}`
3. **Calculate Price**: Frontend calculation or use pricing endpoint
4. **Create Session**: `POST /sessions`
5. **Make Payment**: Integrate with payment gateway
6. **Track Session**: Monitor status through `GET /sessions/seeker`

### For Providers (Managing Sessions):

1. **Set Availability**: `POST /availability` for each day of the week
2. **Receive Session Requests**: `GET /sessions/provider?status=pending`
3. **Validate Sessions**: Review session details (date, time, notes, amount)
4. **Confirm or Reject**: 
   - **Confirm**: `PUT /sessions/{id}` with `status: "confirmed"`
   - **Reject**: `PUT /sessions/{id}` with `status: "rejected"` + reason
5. **Track Progress**: Monitor confirmed sessions through `in_progress` → `completed`
6. **Get Earnings**: Check `totalEarnings` in session summary

### Provider Session Validation Flow:

```javascript
// Get sessions requiring validation
const pendingSessions = await fetch('/api/v1/sessions/provider?status=pending');

// For each session, provider can:
// Option 1: Confirm
await fetch(`/api/v1/sessions/${sessionId}`, {
  method: 'PUT',
  body: JSON.stringify({ status: 'confirmed' })
});

// Option 2: Reject with reason
await fetch(`/api/v1/sessions/${sessionId}`, {
  method: 'PUT', 
  body: JSON.stringify({ 
    status: 'rejected',
    cancellationReason: 'Schedule conflict'
  })
});
```

### Weekly Availability Setup:

```javascript
const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

for (const day of daysOfWeek) {
  await fetch('/api/v1/availability', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      dayOfWeek: day,
      timeSlots: [
        { startTime: '09:00', endTime: '17:00', isAvailable: true }
      ]
    })
  });
}
```

---

## Error Handling

### Common Error Responses:

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Minimum session duration is 0.5 hours",
  "error": "Bad Request"
}
```

**409 Conflict:**
```json
{
  "statusCode": 409,
  "message": "Provider is not available at the requested time",
  "error": "Conflict"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Session not found",
  "error": "Not Found"
}
```

### Frontend Error Handling:

```javascript
try {
  const response = await fetch('/api/v1/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sessionData)
  });

  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 409:
        showError('Provider is not available at this time. Please choose different time.');
        break;
      case 400:
        showError(error.message);
        break;
      default:
        showError('Something went wrong. Please try again.');
    }
    return;
  }

  const session = await response.json();
  // Handle successful session creation
} catch (error) {
  showError('Network error. Please check your connection.');
}
```

---

## Frontend Components Needed

### 1. Session Booking Form
- Service selection
- Date picker
- Time picker with duration
- Real-time price calculation
- Availability checking

### 2. Availability Calendar (Provider)
- Weekly recurring schedule setup
- Time slot management
- Drag-and-drop interface

### 3. Session Dashboard
- List sessions with filters
- Status indicators
- Payment status
- Action buttons (confirm, cancel, update)

### 4. Payment Integration
- Payment gateway integration
- Payment status tracking
- Receipt generation

### 5. Pricing Display
- Show base price + overtime
- Duration slider with live pricing
- Clear breakdown of costs

---

## Service Management (Providers)

### 1. Create Service

**Endpoint:** `POST /services`

**Request Body:**
```json
{
  "title": "Professional House Cleaning",
  "description": "Complete house cleaning including all rooms, kitchen, and bathrooms. Professional equipment provided.",
  "category": "cleaning",
  "location": "Littoral",
  "images": ["image1.jpg", "image2.jpg"],
  "tags": ["eco-friendly", "professional", "reliable"],
  "isAvailable": true
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Professional House Cleaning",
  "description": "Complete house cleaning including all rooms, kitchen, and bathrooms. Professional equipment provided.",
  "category": "cleaning",
  "location": "Littoral",
  "images": ["image1.jpg", "image2.jpg"],
  "tags": ["eco-friendly", "professional", "reliable"],
  "status": "active",
  "providerId": "507f1f77bcf86cd799439012",
  "averageRating": 0,
  "totalReviews": 0,
  "isAvailable": true,
  "createdAt": "2025-08-05T10:30:00.000Z",
  "updatedAt": "2025-08-05T10:30:00.000Z"
}
```

### 2. Update Service

**Endpoint:** `PUT /services/{serviceId}`

**Request Body:**
```json
{
  "title": "Updated Service Title",
  "description": "Updated description",
  "isAvailable": false,
  "status": "inactive"
}
```

### 3. Get My Services

**Endpoint:** `GET /services/provider/me`

### 4. Get Service Details

**Endpoint:** `GET /services/{serviceId}`

### Key Changes in Service Creation:

#### ❌ **Removed Fields** (No Longer Required):
- `pricePerHour` - Pricing is now category-based (3,000 FCFA for all)
- `minimumBookingHours` - All sessions are 4-hour base with overtime
- `maximumBookingHours` - No booking limits, just overtime billing

#### ✅ **Required Fields**:
- `title` - Service name
- `description` - Service details
- `category` - Determines pricing (cleaning, plumbing, etc.)
- `location` - Cameroon province

#### ✅ **Optional Fields**:
- `images` - Service photos
- `tags` - Search keywords
- `isAvailable` - Service availability toggle

### Frontend Service Creation Form:

```javascript
const createService = async (serviceData) => {
  // No pricing fields needed - category determines price automatically
  const payload = {
    title: serviceData.title,
    description: serviceData.description,
    category: serviceData.category, // This determines pricing (3,000 FCFA)
    location: serviceData.location,
    images: serviceData.images || [],
    tags: serviceData.tags || [],
    isAvailable: true
  };

  const response = await fetch('/api/v1/services', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to create service');
  }

  return await response.json();
};
```

### Service Categories & Auto-Pricing:

When a service is created with a specific category, the pricing is automatically determined:

```javascript
const categoryPricing = {
  'cleaning': { basePrice: 3000, overtimeRate: 375 },
  'plumbing': { basePrice: 3000, overtimeRate: 375 },
  'electrical': { basePrice: 3000, overtimeRate: 375 },
  'painting': { basePrice: 3000, overtimeRate: 375 },
  'gardening': { basePrice: 3000, overtimeRate: 375 },
  'carpentry': { basePrice: 3000, overtimeRate: 375 },
  'cooking': { basePrice: 3000, overtimeRate: 375 },
  'tutoring': { basePrice: 3000, overtimeRate: 375 },
  'beauty': { basePrice: 3000, overtimeRate: 375 },
  'maintenance': { basePrice: 3000, overtimeRate: 375 },
  'other': { basePrice: 3000, overtimeRate: 375 }
};
```

---

## Important Notes

1. **All times are in HH:mm format** (24-hour)
2. **Dates are in YYYY-MM-DD format**
3. **Duration is in decimal hours** (e.g., 1.5 = 1 hour 30 minutes)
4. **All prices are in FCFA**
5. **Sessions auto-calculate end time** based on start time + duration
6. **Availability is weekly recurring only** (no specific date overrides)
7. **Payment is required** when session status becomes "confirmed"
8. **Overtime billing** happens in 30-minute increments

This guide provides everything needed to implement the new session-based booking system on the frontend. The system is designed to be simple, predictable, and user-friendly while providing powerful session management capabilities.