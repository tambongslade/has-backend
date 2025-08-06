# Additional Endpoints Documentation

This document covers additional API endpoints needed for enhanced dashboard functionality and wallet management.

## 📋 Table of Contents

- [Provider Dashboard API](#provider-dashboard-api)
- [Wallet & Payment API](#wallet--payment-api)
- [Analytics & Statistics API](#analytics--statistics-api)
- [Withdrawal Management](#withdrawal-management)

---

## 🏠 Provider Dashboard API

### Get Provider Dashboard Summary
**GET** `/providers/dashboard`
**Auth Required**: Yes (Provider)

Returns comprehensive dashboard data including earnings, bookings summary, and recent activities.

**Example Response:**
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
    "joinedDate": "2024-01-15T10:30:00Z"
  },
  "statistics": {
    "activeServices": 8,
    "totalBookings": 156,
    "thisWeekBookings": 12,
    "thisMonthBookings": 45,
    "completedBookings": 142,
    "cancelledBookings": 8,
    "pendingBookings": 6,
    "monthlyEarningsGrowth": 23.5,
    "weeklyBookingsGrowth": 5
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
      "description": "House cleaning for Sarah Johnson",
      "amount": 2500,
      "timestamp": "2024-12-15T14:30:00Z"
    },
    {
      "type": "booking_confirmed",
      "title": "New session confirmed", 
      "description": "Plumbing service scheduled for tomorrow",
      "timestamp": "2024-12-15T09:00:00Z"
    },
    {
      "type": "review_received",
      "title": "New 5-star review",
      "description": "Excellent service, very professional!",
      "rating": 5,
      "timestamp": "2024-12-14T16:20:00Z"
    }
  ]
}
```

### Get Provider Earnings Summary
**GET** `/providers/earnings`
**Auth Required**: Yes (Provider)

**Query Parameters:**
- `period` (optional): `week`, `month`, `year`, `all` (default: `month`)
- `startDate` (optional): Start date for custom range (YYYY-MM-DD)
- `endDate` (optional): End date for custom range (YYYY-MM-DD)

**Example Response:**
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
    },
    {
      "date": "2024-12-14", 
      "amount": 5000,
      "bookingsCount": 2,
      "services": ["Plumbing", "Electrical"]
    }
  ]
}
```

---

## 💰 Wallet & Payment API

### Get Wallet Balance
**GET** `/providers/wallet`
**Auth Required**: Yes (Provider)

**Example Response:**
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
    },
    {
      "_id": "507f1f77bcf86cd799439021",
      "type": "withdrawal",
      "amount": -15000,
      "description": "Bank transfer withdrawal",
      "withdrawalId": "507f1f77bcf86cd799439022",
      "status": "completed",
      "timestamp": "2024-12-14T10:15:00Z"
    }
  ]
}
```

### Request Withdrawal
**POST** `/providers/withdrawals`
**Auth Required**: Yes (Provider)

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
  "requestedAt": "2024-12-15T16:00:00Z"
}
```

### Get Withdrawal History
**GET** `/providers/withdrawals`
**Auth Required**: Yes (Provider)

**Query Parameters:**
- `status` (optional): `pending`, `processing`, `completed`, `failed`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Response:**
```json
{
  "withdrawals": [
    {
      "_id": "507f1f77bcf86cd799439022",
      "amount": 15000,
      "withdrawalMethod": "bank_transfer",
      "status": "completed",
      "withdrawalFee": 500,
      "netAmount": 14500,
      "requestedAt": "2024-12-14T10:00:00Z",
      "processedAt": "2024-12-16T14:30:00Z",
      "bankDetails": {
        "accountName": "John Doe",
        "bankName": "First Bank",
        "accountNumber": "***7890"
      }
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

### Update Withdrawal Status (Admin Only)
**PATCH** `/providers/withdrawals/:id`
**Auth Required**: Yes (Admin)

**Request Body:**
```json
{
  "status": "completed",
  "adminNotes": "Transfer completed successfully",
  "transactionReference": "TXN123456789"
}
```

---

## 📊 Analytics & Statistics API

### Get Provider Analytics
**GET** `/providers/analytics`
**Auth Required**: Yes (Provider)

**Query Parameters:**
- `period` (optional): `week`, `month`, `quarter`, `year` (default: `month`)

**Example Response:**
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
      "title": "Plumbing Repair", 
      "bookings": 8,
      "earnings": 2800
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
    {"hour": 9, "bookings": 8},
    {"hour": 14, "bookings": 12},
    {"hour": 16, "bookings": 6}
  ],
  "weeklyTrend": [
    {"date": "2024-12-09", "bookings": 3, "earnings": 750},
    {"date": "2024-12-10", "bookings": 5, "earnings": 1250},
    {"date": "2024-12-11", "bookings": 2, "earnings": 500}
  ]
}
```

### Get Next Upcoming Bookings
**GET** `/providers/bookings/upcoming`
**Auth Required**: Yes (Provider)

**Query Parameters:**
- `limit` (optional): Number of bookings to return (default: 5)
- `days` (optional): Number of days to look ahead (default: 7)

**Example Response:**
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

## 🏦 Withdrawal Management

### Withdrawal Methods
Available withdrawal methods:
- `bank_transfer`: Direct bank transfer
- `mobile_money`: Mobile money (MTN, Orange)
- `paypal`: PayPal transfer (if available)

### Withdrawal Limits
- Minimum withdrawal: 5,000 FCFA
- Maximum withdrawal: 500,000 FCFA per transaction
- Daily limit: 1,000,000 FCFA
- Monthly limit: 5,000,000 FCFA

### Withdrawal Fees
- Bank transfer: 500 FCFA flat fee
- Mobile money: 2% of amount (min 200 FCFA, max 1000 FCFA)
- PayPal: 3% of amount + 500 FCFA

### Withdrawal Status Flow
```
pending → processing → completed
        ↘ failed ↙
```

### Processing Times
- Bank transfer: 2-3 business days
- Mobile money: 5-10 minutes
- PayPal: 1-2 business days

---

## 🔒 Security & Validation

### Authentication
All endpoints require JWT token with provider role:
```
Authorization: Bearer <provider-jwt-token>
```

### Rate Limiting
- Dashboard endpoints: 100 requests per hour
- Withdrawal requests: 10 requests per hour
- Analytics: 50 requests per hour

### Input Validation
- Withdrawal amounts must be within limits
- Bank details must be validated
- Phone numbers must follow Cameroon format

---

## 📱 Frontend Integration Tips

### 1. Dashboard Refresh Strategy
- Refresh dashboard data every 5 minutes
- Use pull-to-refresh for manual updates
- Cache data locally for offline viewing

### 2. Real-time Updates
- Poll upcoming bookings every 2 minutes
- Show push notifications for new bookings
- Update balance after completed services

### 3. Withdrawal UX
- Show estimated processing times
- Display fees clearly before confirmation
- Provide withdrawal tracking interface

### 4. Error Handling
- Handle insufficient balance gracefully
- Show network error states
- Provide retry mechanisms

---

*These additional endpoints enhance the provider experience with comprehensive wallet management, detailed analytics, and streamlined withdrawal processes.*