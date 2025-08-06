# Provider Dashboard API Documentation

This document provides comprehensive documentation for the HAS (House Service) Provider Dashboard API endpoints.

## Base URL
```
/api/v1/providers
```

## Authentication
All endpoints require JWT authentication with `PROVIDER` role.

**Headers Required:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Dashboard Overview

### Get Dashboard Summary
Retrieves comprehensive dashboard data including provider info, statistics, next booking, and recent activities.

**Endpoint:** `GET /providers/dashboard`

**Response:**
```json
{
  "provider": {
    "id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "totalEarnings": 45200,
    "availableBalance": 12500,
    "pendingBalance": 2800,
    "totalWithdrawn": 42400,
    "averageRating": 4.8,
    "totalReviews": 24,
    "joinedDate": "2024-01-15T00:00:00Z"
  },
  "statistics": {
    "activeServices": 3,
    "totalBookings": 156,
    "thisWeekBookings": 8,
    "thisMonthBookings": 35,
    "completedBookings": 142,
    "cancelledBookings": 12,
    "pendingBookings": 2,
    "monthlyEarningsGrowth": 15.8,
    "weeklyBookingsGrowth": 12.5
  },
  "nextBooking": {
    "_id": "507f1f77bcf86cd799439012",
    "serviceTitle": "House Cleaning Service",
    "seekerName": "Sarah Johnson",
    "bookingDate": "2024-12-16T00:00:00Z",
    "startTime": "10:00",
    "endTime": "14:00",
    "totalAmount": 10000,
    "status": "confirmed",
    "serviceLocation": "Douala, Bonapriso"
  },
  "recentActivities": [
    {
      "type": "booking_completed",
      "title": "Service completed",
      "description": "House Cleaning for Sarah Johnson",
      "amount": 2500,
      "timestamp": "2024-12-15T14:30:00Z"
    },
    {
      "type": "review_received",
      "title": "New review received",
      "description": "5-star review from John Smith",
      "rating": 5,
      "timestamp": "2024-12-14T16:20:00Z"
    }
  ]
}
```

---

## Earnings & Analytics

### Get Earnings Summary
Retrieves earnings data with period filtering, growth metrics, and daily breakdowns.

**Endpoint:** `GET /providers/earnings`

**Query Parameters:**
- `period` (optional): `week`, `month`, `year`, `all` (default: `month`)
- `startDate` (optional): Start date for custom range (YYYY-MM-DD)
- `endDate` (optional): End date for custom range (YYYY-MM-DD)

**Examples:**
```
GET /providers/earnings?period=month
GET /providers/earnings?period=week
GET /providers/earnings?startDate=2024-12-01&endDate=2024-12-31
```

**Response:**
```json
{
  "summary": {
    "totalEarnings": 45200,
    "availableBalance": 12500,
    "pendingBalance": 2800,
    "totalWithdrawn": 42400
  },
  "periodEarnings": {
    "period": "month",
    "amount": 8750,
    "growth": 23.5,
    "bookingsCount": 35
  },
  "earningsBreakdown": [
    {
      "date": "2024-12-15",
      "amount": 2500,
      "bookingsCount": 1,
      "services": ["House Cleaning"]
    }
  ]
}
```

### Get Analytics
Retrieves comprehensive analytics including booking trends, service performance, ratings, and peak hours.

**Endpoint:** `GET /providers/analytics`

**Query Parameters:**
- `period` (optional): `week`, `month`, `quarter`, `year` (default: `month`)

**Response:**
```json
{
  "period": "month",
  "bookings": {
    "total": 45,
    "completed": 42,
    "cancelled": 2,
    "pending": 1,
    "growth": 15.8
  },
  "earnings": {
    "total": 8750,
    "average": 208.3,
    "growth": 23.5
  },
  "services": {
    "mostBooked": {
      "title": "House Cleaning",
      "bookings": 18,
      "earnings": 4500
    },
    "topEarning": {
      "title": "Deep Cleaning",
      "bookings": 8,
      "earnings": 5200
    }
  },
  "ratings": {
    "average": 4.8,
    "totalReviews": 24,
    "distribution": {
      "5": 18,
      "4": 4,
      "3": 2,
      "2": 0,
      "1": 0
    }
  },
  "peakHours": [
    {
      "hour": 9,
      "bookings": 8
    },
    {
      "hour": 14,
      "bookings": 6
    }
  ],
  "weeklyTrend": [
    {
      "date": "2024-12-09",
      "bookings": 3,
      "earnings": 750
    }
  ]
}
```

---

## Wallet Management

### Get Wallet Information
Retrieves wallet balance and recent transaction history.

**Endpoint:** `GET /providers/wallet`

**Response:**
```json
{
  "balance": {
    "available": 12500,
    "pending": 2800,
    "total": 15300,
    "currency": "FCFA"
  },
  "recentTransactions": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "type": "earning",
      "amount": 2500,
      "description": "Payment for House Cleaning Service",
      "bookingId": "507f1f77bcf86cd799439012",
      "status": "completed",
      "timestamp": "2024-12-15T14:30:00Z"
    }
  ]
}
```

---

## Withdrawal Management

### Request Withdrawal
Creates a new withdrawal request with validation and fee calculation.

**Endpoint:** `POST /providers/withdrawals`

**Request Body:**
```json
{
  "amount": 15000,
  "withdrawalMethod": "bank_transfer",
  "bankDetails": {
    "accountName": "John Doe",
    "accountNumber": "1234567890",
    "bankName": "First Bank",
    "swiftCode": "FBNBCMCX"
  },
  "notes": "Monthly withdrawal"
}
```

**Withdrawal Methods:**
- `bank_transfer`: Requires `bankDetails`
- `mobile_money`: Requires `mobileMoneyDetails`
- `paypal`: Requires `paypalDetails`

**Mobile Money Details:**
```json
{
  "mobileMoneyDetails": {
    "mobileNumber": "+237123456789",
    "operator": "MTN",
    "accountName": "John Doe"
  }
}
```

**PayPal Details:**
```json
{
  "paypalDetails": {
    "email": "john.doe@example.com",
    "accountName": "John Doe"
  }
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439022",
  "amount": 15000,
  "withdrawalMethod": "bank_transfer",
  "status": "pending",
  "estimatedProcessingTime": "2-3 business days",
  "withdrawalFee": 500,
  "netAmount": 14500,
  "requestedAt": "2024-12-15T16:00:00Z",
  "notes": "Monthly withdrawal"
}
```

**Withdrawal Limits:**
- Minimum: 5,000 FCFA
- Maximum per transaction: 500,000 FCFA
- Daily limit: 1,000,000 FCFA
- Monthly limit: 5,000,000 FCFA

**Withdrawal Fees:**
- Bank Transfer: 500 FCFA (flat fee)
- Mobile Money: 2% (min: 200 FCFA, max: 1,000 FCFA)
- PayPal: 3% + 500 FCFA

### Get Withdrawal History
Retrieves paginated withdrawal history with filtering options.

**Endpoint:** `GET /providers/withdrawals`

**Query Parameters:**
- `status` (optional): `pending`, `processing`, `completed`, `failed`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

**Examples:**
```
GET /providers/withdrawals?status=completed&page=1&limit=10
GET /providers/withdrawals?page=2
```

**Response:**
```json
{
  "withdrawals": [
    {
      "_id": "507f1f77bcf86cd799439022",
      "amount": 15000,
      "withdrawalMethod": "bank_transfer",
      "status": "completed",
      "estimatedProcessingTime": "2-3 business days",
      "withdrawalFee": 500,
      "netAmount": 14500,
      "requestedAt": "2024-12-15T16:00:00Z",
      "processedAt": "2024-12-16T14:30:00Z",
      "transactionReference": "TXN123456789"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  },
  "summary": {
    "totalWithdrawn": 42400,
    "pendingWithdrawals": 0,
    "averageWithdrawalAmount": 12500
  }
}
```

---

## Upcoming Bookings

### Get Upcoming Bookings
Retrieves upcoming bookings with time calculations and booking summaries.

**Endpoint:** `GET /providers/bookings/upcoming`

**Query Parameters:**
- `limit` (optional): Number of bookings to return (default: 5, max: 20)
- `days` (optional): Number of days to look ahead (default: 7, max: 30)

**Examples:**
```
GET /providers/bookings/upcoming?limit=10&days=14
GET /providers/bookings/upcoming?limit=5
```

**Response:**
```json
{
  "upcomingBookings": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "service": {
        "title": "House Cleaning Service",
        "category": "cleaning"
      },
      "seeker": {
        "fullName": "Sarah Johnson",
        "phoneNumber": "+237123456789"
      },
      "bookingDate": "2024-12-16T00:00:00Z",
      "startTime": "10:00",
      "endTime": "14:00",
      "duration": 4,
      "totalAmount": 10000,
      "status": "confirmed",
      "serviceLocation": "Douala, Bonapriso",
      "specialInstructions": "Please bring eco-friendly supplies",
      "timeUntilBooking": "18 hours"
    }
  ],
  "summary": {
    "nextBooking": "2024-12-16T10:00:00Z",
    "totalUpcoming": 3,
    "totalEarningsExpected": 25000
  }
}
```

---

## Admin Endpoints (Admin Role Required)

### Update Withdrawal Status
Allows administrators to update withdrawal request status.

**Endpoint:** `PATCH /admin/withdrawals/:id`

**Headers Required:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "status": "completed",
  "adminNotes": "Transfer completed successfully",
  "transactionReference": "TXN123456789"
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439022",
  "amount": 15000,
  "withdrawalMethod": "bank_transfer",
  "status": "completed",
  "estimatedProcessingTime": "2-3 business days",
  "withdrawalFee": 500,
  "netAmount": 14500,
  "requestedAt": "2024-12-15T16:00:00Z",
  "processedAt": "2024-12-16T14:30:00Z",
  "adminNotes": "Transfer completed successfully",
  "transactionReference": "TXN123456789"
}
```

---

## Error Responses

### Common Error Codes

**400 Bad Request:**
```json
{
  "message": "Insufficient balance. Available: 10000 FCFA, Requested: 15000 FCFA",
  "error": "InsufficientBalance",
  "statusCode": 400,
  "available": 10000,
  "requested": 15000
}
```

**401 Unauthorized:**
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden:**
```json
{
  "message": "Unauthorized access to resource for provider 507f1f77bcf86cd799439011",
  "error": "UnauthorizedAccess",
  "statusCode": 403
}
```

**404 Not Found:**
```json
{
  "message": "Withdrawal request with ID 507f1f77bcf86cd799439022 not found",
  "error": "WithdrawalNotFound",
  "statusCode": 404
}
```

**422 Validation Error:**
```json
{
  "message": [
    "amount must be a number",
    "amount must not be less than 5000"
  ],
  "error": "Unprocessable Entity",
  "statusCode": 422
}
```

---

## Rate Limits

- Dashboard: 100 requests per hour
- Earnings: 50 requests per hour
- Analytics: 50 requests per hour
- Withdrawal Request: 10 requests per hour
- Withdrawal History: 100 requests per hour

---

## Currency

All monetary values are in **Central African CFA franc (FCFA)**.

---

## Swagger Documentation

Full interactive API documentation is available at:
```
http://localhost:3000/api/docs
```

---

## Support

For API support and questions, please refer to the main application documentation or contact the development team.