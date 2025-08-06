# Provider Browsing API Documentation

This documentation covers the new endpoints that allow seekers to browse service providers, view their profiles, check availability, and book sessions.

## Overview

The Provider Browsing API consists of three main endpoints that enable seekers to:
1. Browse all available service providers with search and filtering
2. Find providers by specific service categories
3. View detailed provider profiles including services and availability

## Base URL
```
http://localhost:3000/api/v1
```

## Endpoints

### 1. Get All Service Providers

**Endpoint:** `GET /users/provider/all`

**Description:** Retrieve all users with provider role, with optional filtering and search capabilities.

**Query Parameters:**
- `search` (optional): Search providers by name, email, or phone number
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

**Example Requests:**

```bash
# Get all providers (first page)
GET /users/provider/all

# Search for providers by name
GET /users/provider/all?search=john

# Get second page with 10 providers per page
GET /users/provider/all?page=2&limit=10

# Search with pagination
GET /users/provider/all?search=plumber&page=1&limit=5
```

**Response Format:**
```json
{
  "providers": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+237600000000",
      "role": "provider",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

### 2. Get Providers by Category

**Endpoint:** `GET /services/providers/category/{category}`

**Description:** Retrieve all providers who offer services in a specific category, grouped by provider to avoid duplicates.

**Path Parameters:**
- `category` (required): Service category (enum)

**Available Categories:**
- `cleaning`
- `plumbing`
- `electrical`
- `painting`
- `gardening`
- `carpentry`
- `cooking`
- `tutoring`
- `beauty`
- `maintenance`
- `other`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

**Example Requests:**

```bash
# Get all plumbing providers
GET /services/providers/category/plumbing

# Get cleaning providers with pagination
GET /services/providers/category/cleaning?page=1&limit=10
```

**Response Format:**
```json
{
  "providers": [
    {
      "provider": {
        "_id": "507f1f77bcf86cd799439011",
        "fullName": "John Doe",
        "email": "john.doe@example.com",
        "phoneNumber": "+237600000000"
      },
      "services": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "title": "Professional Plumbing Services",
          "pricePerHour": 5000,
          "averageRating": 4.5,
          "totalReviews": 12
        }
      ]
    }
  ],
  "category": "plumbing",
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### 3. Get Provider Profile with Details

**Endpoint:** `GET /users/provider/{id}/profile`

**Description:** Get detailed provider profile including their services, availability schedule, and aggregated statistics.

**Path Parameters:**
- `id` (required): Provider's unique identifier

**Example Request:**

```bash
# Get detailed provider profile
GET /users/provider/507f1f77bcf86cd799439011/profile
```

**Response Format:**
```json
{
  "provider": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+237600000000",
    "role": "provider",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "services": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Professional Plumbing Services",
      "description": "Expert plumbing solutions for homes and businesses",
      "category": "plumbing",
      "pricePerHour": 5000,
      "averageRating": 4.5,
      "totalReviews": 12,
      "images": ["image1.jpg", "image2.jpg"]
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "title": "Emergency Plumbing Repairs",
      "description": "24/7 emergency plumbing repair services",
      "category": "plumbing",
      "pricePerHour": 7500,
      "averageRating": 4.8,
      "totalReviews": 8,
      "images": ["emergency1.jpg"]
    }
  ],
  "availability": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "dayOfWeek": "monday",
      "timeSlots": [
        {
          "startTime": "08:00",
          "endTime": "12:00",
          "isAvailable": true
        },
        {
          "startTime": "14:00",
          "endTime": "18:00",
          "isAvailable": true
        }
      ],
      "notes": "Available for regular services"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "dayOfWeek": "tuesday",
      "timeSlots": [
        {
          "startTime": "09:00",
          "endTime": "17:00",
          "isAvailable": true
        }
      ]
    }
  ],
  "totalServices": 2,
  "averageRating": 4.65,
  "totalReviews": 20,
  "message": "Provider profile retrieved successfully"
}
```

## Frontend Integration Workflow

Here's how to integrate these endpoints in your frontend application:

### 1. Browse All Providers (Home/Search Page)

```javascript
// Fetch all providers with search
async function fetchProviders(searchTerm = '', page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (searchTerm) {
    params.append('search', searchTerm);
  }
  
  const response = await fetch(`/api/v1/users/provider/all?${params}`);
  return await response.json();
}

// Usage in React component
const [providers, setProviders] = useState([]);
const [loading, setLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState('');

const loadProviders = async () => {
  setLoading(true);
  try {
    const data = await fetchProviders(searchTerm);
    setProviders(data.providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
  } finally {
    setLoading(false);
  }
};
```

### 2. Browse by Category (Category Pages)

```javascript
// Fetch providers by category
async function fetchProvidersByCategory(category, page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  const response = await fetch(`/api/v1/services/providers/category/${category}?${params}`);
  return await response.json();
}

// Usage for category-specific pages
const CategoryPage = ({ category }) => {
  const [providers, setProviders] = useState([]);
  
  useEffect(() => {
    fetchProvidersByCategory(category).then(data => {
      setProviders(data.providers);
    });
  }, [category]);
  
  return (
    <div>
      <h1>{category.charAt(0).toUpperCase() + category.slice(1)} Providers</h1>
      {providers.map(item => (
        <ProviderCard 
          key={item.provider._id}
          provider={item.provider}
          services={item.services}
        />
      ))}
    </div>
  );
};
```

### 3. Provider Profile Page

```javascript
// Fetch detailed provider profile
async function fetchProviderProfile(providerId) {
  const response = await fetch(`/api/v1/users/provider/${providerId}/profile`);
  return await response.json();
}

// Usage in provider profile page
const ProviderProfile = ({ providerId }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchProviderProfile(providerId).then(data => {
      setProfile(data);
      setLoading(false);
    });
  }, [providerId]);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <ProviderInfo provider={profile.provider} />
      <ServicesList services={profile.services} />
      <AvailabilityCalendar availability={profile.availability} />
      <BookingForm 
        providerId={providerId}
        services={profile.services}
        availability={profile.availability}
      />
    </div>
  );
};
```

## Complete User Journey

### For Seekers browsing providers:

1. **Discovery Phase:**
   - Use `GET /users/provider/all` with search to find providers by name/location
   - Use `GET /services/providers/category/{category}` to browse by service type
   - Display provider cards with basic info and service summary

2. **Selection Phase:**
   - Click on a provider to view their detailed profile
   - Use `GET /users/provider/{id}/profile` to get full provider information
   - View services, ratings, availability, and pricing

3. **Booking Phase:**
   - Check provider's availability schedule
   - Select desired service and time slot
   - Proceed to booking using existing booking endpoints

### Example Complete Frontend Flow:

```javascript
// 1. Search/Browse providers
const searchResults = await fetchProviders('plumber');

// 2. Select a provider and view profile
const selectedProviderId = searchResults.providers[0]._id;
const providerProfile = await fetchProviderProfile(selectedProviderId);

// 3. Check availability and book
const availableTimeSlots = providerProfile.availability
  .find(day => day.dayOfWeek === 'monday')
  .timeSlots.filter(slot => slot.isAvailable);

// 4. Create booking (using existing booking endpoint)
const bookingData = {
  serviceId: providerProfile.services[0]._id,
  providerId: selectedProviderId,
  date: '2024-02-15',
  startTime: availableTimeSlots[0].startTime,
  duration: 2
};

// Use existing booking endpoint
await createBooking(bookingData);
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Successful request
- `404 Not Found`: Provider not found or invalid category
- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Server error

Example error response:
```json
{
  "statusCode": 404,
  "message": "Provider with ID \"invalid-id\" not found",
  "error": "Not Found"
}
```

## Rate Limiting and Performance

- Pagination is enforced with a maximum limit of 50 items per page
- Search queries are case-insensitive and use regex matching
- Provider profiles include aggregated statistics for better UX
- All endpoints exclude sensitive data like passwords

## Integration with Existing Booking System

These endpoints work seamlessly with the existing booking system:

1. Use provider browsing endpoints to discover providers
2. View provider profiles to check availability
3. Use existing `POST /bookings` endpoint to create bookings
4. Use existing availability management endpoints for real-time updates

This creates a complete workflow from discovery to booking for your service marketplace.

## User Booking Management Endpoints

Once users have booked services, they can manage and view their bookings using the following endpoints:

### 4. Get User Bookings (Seeker)

**Endpoint:** `GET /bookings/my-bookings`

**Description:** Retrieve all bookings made by the authenticated seeker with optional filtering and pagination.

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**
- `status` (optional): Filter by booking status
  - Available values: `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `rejected`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

**Example Requests:**

```bash
# Get all my bookings
GET /bookings/my-bookings
Authorization: Bearer your-jwt-token

# Get only completed bookings
GET /bookings/my-bookings?status=completed

# Get pending bookings with pagination
GET /bookings/my-bookings?status=pending&page=1&limit=10
```

**Response Format:**
```json
{
  "bookings": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "serviceId": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Professional House Cleaning",
        "category": "cleaning",
        "pricePerHour": 5000,
        "images": ["cleaning1.jpg", "cleaning2.jpg"]
      },
      "providerId": {
        "_id": "507f1f77bcf86cd799439011",
        "fullName": "John Doe",
        "email": "john.doe@example.com",
        "phoneNumber": "+237600000000"
      },
      "bookingDate": "2024-02-15T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "13:00",
      "duration": 4,
      "totalAmount": 20000,
      "currency": "FCFA",
      "status": "confirmed",
      "paymentStatus": "paid",
      "serviceLocation": "Littoral",
      "specialInstructions": "Please use eco-friendly products",
      "seekerRating": 5,
      "seekerReview": "Excellent service! Very professional.",
      "createdAt": "2024-02-10T08:30:00Z",
      "updatedAt": "2024-02-15T13:30:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "summary": {
    "totalBookings": 15,
    "pending": 2,
    "confirmed": 3,
    "inProgress": 1,
    "completed": 8,
    "cancelled": 1,
    "rejected": 0,
    "totalEarnings": 0
  }
}
```

### 5. Get Provider Bookings (Provider)

**Endpoint:** `GET /bookings/provider-bookings`

**Description:** Retrieve all bookings for the authenticated provider with optional filtering and pagination.

**Authentication:** Required (JWT Bearer token - Provider role)

**Query Parameters:**
- `status` (optional): Filter by booking status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

**Example Requests:**

```bash
# Get all provider bookings
GET /bookings/provider-bookings
Authorization: Bearer provider-jwt-token

# Get confirmed bookings only
GET /bookings/provider-bookings?status=confirmed

# Get completed bookings to see earnings
GET /bookings/provider-bookings?status=completed&page=1&limit=5
```

**Response Format:**
```json
{
  "bookings": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "serviceId": {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Professional House Cleaning",
        "category": "cleaning",
        "pricePerHour": 5000,
        "images": ["cleaning1.jpg"]
      },
      "seekerId": {
        "_id": "507f1f77bcf86cd799439025",
        "fullName": "Jane Smith",
        "email": "jane.smith@example.com",
        "phoneNumber": "+237700000000"
      },
      "bookingDate": "2024-02-15T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "13:00",
      "duration": 4,
      "totalAmount": 20000,
      "currency": "FCFA",
      "status": "completed",
      "paymentStatus": "paid",
      "serviceLocation": "Littoral",
      "providerRating": 4,
      "providerReview": "Great client, clear instructions",
      "createdAt": "2024-02-10T08:30:00Z",
      "updatedAt": "2024-02-15T13:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  },
  "summary": {
    "totalBookings": 25,
    "pending": 3,
    "confirmed": 5,
    "inProgress": 2,
    "completed": 12,
    "cancelled": 2,
    "rejected": 1,
    "totalEarnings": 180000
  }
}
```

### 6. Get Specific Booking Details

**Endpoint:** `GET /bookings/{id}`

**Description:** Get detailed information about a specific booking.

**Authentication:** Required (JWT Bearer token)

**Path Parameters:**
- `id` (required): Booking ID

**Example Request:**

```bash
GET /bookings/507f1f77bcf86cd799439020
Authorization: Bearer your-jwt-token
```

**Response Format:**
```json
{
  "_id": "507f1f77bcf86cd799439020",
  "serviceId": {
    "_id": "507f1f77bcf86cd799439012",
    "title": "Professional House Cleaning",
    "category": "cleaning",
    "pricePerHour": 5000,
    "description": "Complete house cleaning service",
    "images": ["cleaning1.jpg", "cleaning2.jpg"]
  },
  "seekerId": {
    "_id": "507f1f77bcf86cd799439025",
    "fullName": "Jane Smith",
    "email": "jane.smith@example.com",
    "phoneNumber": "+237700000000"
  },
  "providerId": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+237600000000"
  },
  "bookingDate": "2024-02-15T00:00:00.000Z",
  "startTime": "09:00",
  "endTime": "13:00",
  "duration": 4,
  "totalAmount": 20000,
  "currency": "FCFA",
  "status": "completed",
  "paymentStatus": "paid",
  "serviceLocation": "Littoral",
  "specialInstructions": "Please use eco-friendly products",
  "seekerRating": 5,
  "seekerReview": "Excellent service! Very professional.",
  "providerRating": 4,
  "providerReview": "Great client, clear instructions",
  "createdAt": "2024-02-10T08:30:00Z",
  "updatedAt": "2024-02-15T13:30:00Z"
}
```

## Booking Status Workflow

Understanding booking statuses is crucial for managing the user experience:

1. **pending** - Initial booking request, awaiting provider confirmation
2. **confirmed** - Provider has accepted the booking
3. **in_progress** - Service is currently being performed
4. **completed** - Service has been finished successfully
5. **cancelled** - Booking was cancelled by either party
6. **rejected** - Provider declined the booking request

## Frontend Integration for Booking Management

### Seeker Dashboard Implementation

```javascript
// Fetch seeker bookings with filtering
async function fetchMyBookings(status = '', page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (status) {
    params.append('status', status);
  }
  
  const response = await fetch(`/api/v1/bookings/my-bookings?${params}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  return await response.json();
}

// Usage in React component
const SeekerDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('');
  const [summary, setSummary] = useState({});
  
  const loadBookings = async () => {
    const data = await fetchMyBookings(filter);
    setBookings(data.bookings);
    setSummary(data.summary);
  };
  
  useEffect(() => {
    loadBookings();
  }, [filter]);
  
  return (
    <div>
      <BookingSummary summary={summary} />
      <BookingFilters onFilterChange={setFilter} />
      <BookingsList bookings={bookings} />
    </div>
  );
};
```

### Provider Dashboard Implementation

```javascript
// Fetch provider bookings
async function fetchProviderBookings(status = '', page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (status) {
    params.append('status', status);
  }
  
  const response = await fetch(`/api/v1/bookings/provider-bookings?${params}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  return await response.json();
}

// Usage in provider dashboard
const ProviderDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({});
  
  const loadBookings = async (status = '') => {
    const data = await fetchProviderBookings(status);
    setBookings(data.bookings);
    setSummary(data.summary);
  };
  
  return (
    <div>
      <EarningsSummary summary={summary} />
      <BookingRequests 
        bookings={bookings.filter(b => b.status === 'pending')} 
      />
      <ActiveBookings 
        bookings={bookings.filter(b => ['confirmed', 'in_progress'].includes(b.status))} 
      />
    </div>
  );
};
```

### Complete Booking Management Workflow

```javascript
// Complete booking management system
class BookingManager {
  
  // Get bookings for current user (role-aware)
  async getMyBookings(userRole, filters = {}) {
    const endpoint = userRole === 'provider' 
      ? '/api/v1/bookings/provider-bookings'
      : '/api/v1/bookings/my-bookings';
      
    const params = new URLSearchParams(filters);
    const response = await fetch(`${endpoint}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
    
    return await response.json();
  }
  
  // Get specific booking details
  async getBookingDetails(bookingId) {
    const response = await fetch(`/api/v1/bookings/${bookingId}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
    
    return await response.json();
  }
  
  // Update booking status (for providers)
  async updateBookingStatus(bookingId, status) {
    const response = await fetch(`/api/v1/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({ status })
    });
    
    return await response.json();
  }
  
  // Cancel booking
  async cancelBooking(bookingId, reason) {
    const response = await fetch(`/api/v1/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({ reason })
    });
    
    return await response.json();
  }
  
  getToken() {
    return localStorage.getItem('authToken');
  }
}
```

## Error Handling for Booking Endpoints

All booking endpoints return appropriate HTTP status codes:

- `200 OK`: Successful request
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Access denied (wrong role or not authorized)
- `404 Not Found`: Booking not found
- `400 Bad Request`: Invalid parameters

Example error responses:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}

{
  "statusCode": 404,
  "message": "Booking not found",
  "error": "Not Found"
}
```

This completes the booking management system that works seamlessly with the provider browsing functionality, creating a full-featured service marketplace API.