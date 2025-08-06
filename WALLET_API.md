# Wallet API Documentation

## Overview
The Wallet API allows providers to manage their earnings and withdraw money from completed bookings. The system automatically processes earnings when bookings are marked as completed, with a 10% platform commission deducted.

## Authentication
All wallet endpoints require JWT authentication. Include the bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get Wallet Balance
**GET** `/wallet/balance`

Returns the provider's current wallet information including balance, pending earnings, and totals.

**Response:**
```json
{
  "balance": 45000,
  "pendingBalance": 15000,
  "totalEarnings": 60000,
  "totalWithdrawn": 0,
  "currency": "FCFA",
  "isActive": true
}
```

### 2. Get Earnings History
**GET** `/wallet/earnings?page=1&limit=10`

Returns paginated earnings history from completed bookings.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "transactions": [
    {
      "_id": "...",
      "type": "earning",
      "amount": 4500,
      "currency": "FCFA",
      "status": "completed",
      "description": "Earning from completed booking",
      "bookingId": "...",
      "createdAt": "2024-12-15T10:30:00Z",
      "processedAt": "2024-12-15T10:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

### 3. Get All Transaction History
**GET** `/wallet/transactions?page=1&limit=10`

Returns all transactions including earnings, withdrawals, and commissions.

### 4. Get Withdrawal History
**GET** `/wallet/withdrawals?page=1&limit=10`

Returns paginated withdrawal history.

### 5. Create Withdrawal Request
**POST** `/wallet/withdraw`

Creates a new withdrawal request. Minimum withdrawal amount is 1000 FCFA.

**Request Body:**
```json
{
  "amount": 25000,
  "withdrawalMethod": "mobile_money",
  "withdrawalDetails": {
    "mobileNumber": "+237123456789",
    "operatorName": "MTN"
  },
  "description": "Monthly withdrawal"
}
```

**Withdrawal Methods:**
- `bank_transfer`: Requires `bankName`, `accountNumber`, `accountName`
- `mobile_money`: Requires `mobileNumber`, `operatorName`
- `cash`: No additional details required

**Response:**
```json
{
  "id": "...",
  "type": "withdrawal",
  "amount": 25000,
  "currency": "FCFA",
  "status": "pending",
  "description": "Monthly withdrawal",
  "withdrawalMethod": "mobile_money",
  "transactionReference": "WTH-1702641000000-ABC123",
  "createdAt": "2024-12-15T10:30:00Z"
}
```

## Automatic Earning Processing

When a booking is marked as `completed`, the system automatically:

1. **Calculates Provider Earning**: Total booking amount minus 10% platform commission
2. **Creates Earning Transaction**: Records the provider's earning
3. **Creates Commission Transaction**: Records the platform commission (negative amount)
4. **Updates Wallet Balance**: Adds the net earning to the provider's available balance
5. **Updates Pending Balance**: Removes the amount from pending earnings

### Example:
- Booking Total: 5000 FCFA
- Platform Commission (10%): 500 FCFA
- Provider Earning: 4500 FCFA

## Error Responses

### Insufficient Balance (400)
```json
{
  "statusCode": 400,
  "message": "Insufficient balance for withdrawal",
  "error": "Bad Request"
}
```

### Minimum Withdrawal Amount (400)
```json
{
  "statusCode": 400,
  "message": ["Minimum withdrawal amount is 1000 FCFA"],
  "error": "Bad Request"
}
```

## Integration with Bookings

The wallet system is automatically integrated with the booking system. When you update a booking status to `completed` via the bookings API:

**PATCH** `/bookings/{bookingId}`
```json
{
  "status": "completed"
}
```

The system will automatically process the provider's earning and update their wallet balance.

## Notes

- All amounts are in FCFA (Central African Franc)
- Withdrawal requests are created with `pending` status and require manual processing
- The system prevents duplicate earning processing for the same booking
- Pending balance shows earnings from confirmed/in-progress bookings that are paid but not yet completed