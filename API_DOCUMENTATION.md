# House Service API Documentation

This documentation covers the Services and Bookings API for the House Service platform where providers offer services and seekers can book them.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Services API](#services-api)
- [Bookings API](#bookings-api)
- [Availability API](#availability-api)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)

---

## 🔐 Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles
- **SEEKER**: Can browse services and create bookings
- **PROVIDER**: Can create services, manage availability, and handle bookings

---

## 🛍️ Services API

### Get All Services
**GET** `/services`

Retrieve all available services with optional filtering and pagination.

**Query Parameters:**
- `category` (optional): Filter by service category
- `location` (optional): Filter by location (partial match)
- `minPrice` (optional): Minimum price per hour in FCFA
- `maxPrice` (optional): Maximum price per hour in FCFA
- `search` (optional): Search in title, description, and tags
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

**Example Request:**
```bash
GET /services?category=cleaning&location=Douala&minPrice=1000&maxPrice=5000&page=1&limit=10
```

**Example Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Professional House Cleaning",
    "description": "Complete house cleaning including all rooms, kitchen, and bathrooms",
    "category": "cleaning",
    "pricePerHour": 2500,
    "currency": "FCFA",
    "location": "Douala, Cameroon",
    "images": ["image1.jpg", "image2.jpg"],
    "tags": ["eco-friendly", "professional"],
    "isAvailable": true,
    "minimumBookingHours": 2,
    "maximumBookingHours": 8,
    "averageRating": 4.5,
    "totalReviews": 12,
    "providerId": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+237123456789"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Get Service Categories
**GET** `/services/categories`

Get all available service categories.

**Example Response:**
```json
{
  "categories": [
    "cleaning",
    "plumbing",
    "electrical",
    "painting",
    "gardening",
    "carpentry",
    "cooking",
    "tutoring",
    "beauty",
    "maintenance",
    "other"
  ]
}
```

### Get Service by ID
**GET** `/services/:id`

**Example Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Professional House Cleaning",
  "description": "Complete house cleaning service...",
  "category": "cleaning",
  "pricePerHour": 2500,
  "currency": "FCFA",
  "location": "Douala, Cameroon",
  "providerId": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+237123456789"
  }
}
```

### Create Service (Provider Only)
**POST** `/services`
**Auth Required**: Yes (Provider)

**Request Body:**
```json
{
  "title": "Professional House Cleaning",
  "description": "Complete house cleaning including all rooms, kitchen, and bathrooms. Professional equipment provided.",
  "category": "cleaning",
  "pricePerHour": 2500,
  "images": ["image1.jpg", "image2.jpg"],
  "location": "Douala, Cameroon",
  "tags": ["eco-friendly", "professional", "reliable"],
  "isAvailable": true,
  "minimumBookingHours": 2,
  "maximumBookingHours": 8
}
```

### Get My Services (Provider Only)
**GET** `/services/my-services`
**Auth Required**: Yes (Provider)

Returns all services created by the authenticated provider.

### Update Service (Provider Only)
**PATCH** `/services/:id`
**Auth Required**: Yes (Provider - own services only)

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Service Title",
  "pricePerHour": 3000,
  "isAvailable": false,
  "status": "inactive"
}
```

### Delete Service (Provider Only)
**DELETE** `/services/:id`
**Auth Required**: Yes (Provider - own services only)

### Search Services by Location
**GET** `/services/search?location=Douala&limit=20`

---

## 📅 Bookings API

### Create Booking (Seeker Only)
**POST** `/bookings`
**Auth Required**: Yes (Seeker)

**Request Body:**
```json
{
  "serviceId": "507f1f77bcf86cd799439011",
  "bookingDate": "2024-12-15",
  "startTime": "09:00",
  "endTime": "17:00",
  "duration": 8,
  "serviceLocation": "Littoral",
  "specialInstructions": "Please bring eco-friendly cleaning supplies. Access code is 1234."
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "serviceId": "507f1f77bcf86cd799439011",
  "seekerId": "507f1f77bcf86cd799439013",
  "providerId": "507f1f77bcf86cd799439014",
  "bookingDate": "2024-12-15T00:00:00Z",
  "startTime": "09:00",
  "endTime": "17:00",
  "duration": 8,
  "totalAmount": 20000,
  "currency": "FCFA",
  "status": "pending",
  "paymentStatus": "pending",
  "serviceLocation": "Littoral",
  "specialInstructions": "Please bring eco-friendly supplies",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Get My Bookings (Seeker)
**GET** `/bookings/my-bookings`
**Auth Required**: Yes (Seeker)

Returns all bookings created by the authenticated seeker.

### Get Provider Bookings (Provider)
**GET** `/bookings/provider-bookings`
**Auth Required**: Yes (Provider)

Returns all bookings for the authenticated provider's services.

### Get Booking by ID
**GET** `/bookings/:id`
**Auth Required**: Yes

### Update Booking
**PATCH** `/bookings/:id`
**Auth Required**: Yes (Seeker or Provider involved in booking)

**Request Body:** (All fields optional)
```json
{
  "status": "confirmed",
  "paymentStatus": "paid",
  "providerNotes": "Service completed successfully"
}
```

### Cancel Booking
**PATCH** `/bookings/:id/cancel`
**Auth Required**: Yes (Seeker or Provider involved)

**Request Body:**
```json
{
  "reason": "Schedule conflict"
}
```

### Add Review to Booking
**POST** `/bookings/:id/review`
**Auth Required**: Yes (Seeker or Provider involved)

**Request Body:**
```json
{
  "rating": 5,
  "review": "Excellent service! Very professional and thorough cleaning."
}
```

---

## 🕐 Availability API

### Create Availability (Provider Only)
**POST** `/bookings/availability`
**Auth Required**: Yes (Provider)

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

### Get Provider Availability
**GET** `/bookings/availability/provider/:providerId`

Returns the availability schedule for a specific provider.

### Get My Availability (Provider)
**GET** `/bookings/availability/my-schedule`
**Auth Required**: Yes (Provider)

### Update Availability (Provider)
**PATCH** `/bookings/availability/:id`
**Auth Required**: Yes (Provider - own availability only)

### Delete Availability (Provider)
**DELETE** `/bookings/availability/:id`
**Auth Required**: Yes (Provider - own availability only)

---

## ⚠️ Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created successfully
- `400`: Bad Request (invalid data)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (e.g., booking time conflicts)
- `500`: Internal Server Error

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Validation failed: duration must be between 1 and 24 hours",
  "error": "Bad Request"
}
```

---

## 💡 Usage Examples

### Complete Workflow Example

#### 1. Provider Setup
```bash
# Create a service
POST /services
{
  "title": "House Cleaning Service",
  "category": "cleaning",
  "pricePerHour": 2500,
  "location": "Douala",
  "minimumBookingHours": 2
}

# Set availability
POST /bookings/availability
{
  "dayOfWeek": "monday",
  "timeSlots": [
    {"startTime": "09:00", "endTime": "17:00", "isAvailable": true}
  ]
}
```

#### 2. Seeker Booking Process
```bash
# Browse services
GET /services?category=cleaning&location=Douala

# Check provider availability
GET /bookings/availability/provider/507f1f77bcf86cd799439014

# Create booking
POST /bookings
{
  "serviceId": "507f1f77bcf86cd799439011",
  "bookingDate": "2024-12-16",
  "startTime": "10:00",
  "endTime": "14:00",
  "duration": 4,
  "serviceLocation": "Littoral"
}
```

#### 3. Provider Managing Bookings
```bash
# View incoming bookings
GET /bookings/provider-bookings

# Confirm booking
PATCH /bookings/507f1f77bcf86cd799439012
{
  "status": "confirmed"
}

# Mark as completed
PATCH /bookings/507f1f77bcf86cd799439012
{
  "status": "completed",
  "providerNotes": "Service completed successfully"
}
```

#### 4. Review System
```bash
# Seeker reviews provider
POST /bookings/507f1f77bcf86cd799439012/review
{
  "rating": 5,
  "review": "Excellent cleaning service!"
}

# Provider reviews seeker
POST /bookings/507f1f77bcf86cd799439012/review
{
  "rating": 4,
  "review": "Great client, clear instructions"
}
```

### Booking States Flow
```
pending → confirmed → in_progress → completed
                  ↘ cancelled ↙
```

### Payment States Flow
```
pending → paid → (service completed)
       ↘ failed → pending (retry)
```

---

## 📱 Frontend Integration Tips

### 1. Service Browsing
- Use filtering parameters to create advanced search
- Implement pagination for better performance
- Show provider ratings and reviews

### 2. Booking Calendar
- Fetch provider availability before showing time slots
- Validate booking duration against service limits
- Show real-time availability

### 3. Real-time Updates
- Poll booking status for updates
- Implement push notifications for booking confirmations
- Show booking progress (pending → confirmed → completed)

### 4. Currency Display
All prices are in FCFA. Format example:
```javascript
const formatPrice = (price) => `${price.toLocaleString()} FCFA`;
// 2500 → "2,500 FCFA"
```

---

## 🔧 Development Notes

### Environment Variables Required
```env
MONGODB_URI=mongodb://localhost:27017/house_service_db
JWT_SECRET=your-secret-key
```

### Testing with Swagger
- Visit `http://localhost:3000/api/docs` for interactive API documentation
- Use the "Authorize" button to add your JWT token
- Test all endpoints directly from the browser

### Database Indexing
The system automatically creates indexes for:
- `email` (unique)
- `providerId` + `dayOfWeek` (availability)
- `bookingDate` + `providerId` (booking conflicts)

---

*This API uses FCFA as the default currency and implements comprehensive validation, authentication, and error handling for a robust booking system.*