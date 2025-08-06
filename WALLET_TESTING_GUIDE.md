# Wallet System Testing Guide

## Prerequisites
1. Start your NestJS application: `npm run start:dev`
2. Have a valid JWT token for a provider user
3. Use Postman, curl, or any API testing tool

## Testing Endpoints

### 1. Test Wallet Balance
```bash
GET http://localhost:3000/wallet/balance
Authorization: Bearer YOUR_JWT_TOKEN

# Expected Response:
{
  "balance": 0,
  "pendingBalance": 0,
  "totalEarnings": 0,
  "totalWithdrawn": 0,
  "currency": "FCFA",
  "isActive": true
}
```

### 2. Test Earnings History
```bash
GET http://localhost:3000/wallet/earnings?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN

# Expected Response:
{
  "transactions": [],
  "total": 0,
  "page": 1,
  "totalPages": 0
}
```

### 3. Test Transaction History
```bash
GET http://localhost:3000/wallet/transactions?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN

# Expected Response:
{
  "transactions": [],
  "total": 0,
  "page": 1,
  "totalPages": 0
}
```

### 4. Test Withdrawal Request
```bash
POST http://localhost:3000/wallet/withdraw
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "amount": 1000,
  "withdrawalMethod": "mobile_money",
  "withdrawalDetails": {
    "mobileNumber": "+237123456789",
    "operatorName": "MTN"
  },
  "description": "Test withdrawal"
}

# Expected Response (if balance is insufficient):
{
  "statusCode": 400,
  "message": "Insufficient balance for withdrawal",
  "error": "Bad Request"
}
```

## Testing the Complete Workflow

### Step 1: Create a Booking and Complete It
First, you need to have a completed booking to generate earnings:

```bash
# 1. Create a booking (as a seeker)
POST http://localhost:3000/bookings
Authorization: Bearer SEEKER_JWT_TOKEN
Content-Type: application/json

{
  "serviceId": "YOUR_SERVICE_ID",
  "bookingDate": "2024-12-20",
  "startTime": "09:00",
  "endTime": "12:00",
  "duration": 3,
  "serviceLocation": "Littoral",
  "specialInstructions": "Test booking for wallet"
}

# 2. Update booking status to completed (as provider or admin)
PATCH http://localhost:3000/bookings/BOOKING_ID
Authorization: Bearer PROVIDER_JWT_TOKEN
Content-Type: application/json

{
  "status": "completed"
}
```

### Step 2: Check Wallet After Completion
```bash
GET http://localhost:3000/wallet/balance
Authorization: Bearer PROVIDER_JWT_TOKEN

# Should now show earnings (90% of booking amount)
{
  "balance": 2700,  // If booking was 3000 FCFA (3000 * 0.9)
  "pendingBalance": 0,
  "totalEarnings": 2700,
  "totalWithdrawn": 0,
  "currency": "FCFA",
  "isActive": true
}
```

### Step 3: Check Earnings History
```bash
GET http://localhost:3000/wallet/earnings
Authorization: Bearer PROVIDER_JWT_TOKEN

# Should show the earning transaction
{
  "transactions": [
    {
      "_id": "...",
      "type": "earning",
      "amount": 2700,
      "currency": "FCFA",
      "status": "completed",
      "description": "Earning from completed booking",
      "bookingId": "...",
      "createdAt": "2024-12-15T10:30:00Z",
      "processedAt": "2024-12-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### Step 4: Test Successful Withdrawal
```bash
POST http://localhost:3000/wallet/withdraw
Authorization: Bearer PROVIDER_JWT_TOKEN
Content-Type: application/json

{
  "amount": 2000,
  "withdrawalMethod": "bank_transfer",
  "withdrawalDetails": {
    "bankName": "Afriland First Bank",
    "accountNumber": "12345678901",
    "accountName": "John Doe"
  },
  "description": "Monthly withdrawal"
}

# Expected Response:
{
  "id": "...",
  "type": "withdrawal",
  "amount": 2000,
  "currency": "FCFA",
  "status": "pending",
  "description": "Monthly withdrawal",
  "withdrawalMethod": "bank_transfer",
  "transactionReference": "WTH-1702641000000-ABC123",
  "createdAt": "2024-12-15T10:30:00Z"
}
```

### Step 5: Verify Updated Balance
```bash
GET http://localhost:3000/wallet/balance
Authorization: Bearer PROVIDER_JWT_TOKEN

# Balance should be reduced
{
  "balance": 700,     // 2700 - 2000
  "pendingBalance": 0,
  "totalEarnings": 2700,
  "totalWithdrawn": 2000,
  "currency": "FCFA",
  "isActive": true
}
```

## Error Testing

### Test Insufficient Balance
```bash
POST http://localhost:3000/wallet/withdraw
{
  "amount": 10000,  // More than available balance
  "withdrawalMethod": "mobile_money",
  "withdrawalDetails": {
    "mobileNumber": "+237123456789",
    "operatorName": "MTN"
  }
}

# Expected: 400 Bad Request
```

### Test Invalid Withdrawal Amount
```bash
POST http://localhost:3000/wallet/withdraw
{
  "amount": 500,  // Less than minimum (1000 FCFA)
  "withdrawalMethod": "mobile_money",
  "withdrawalDetails": {
    "mobileNumber": "+237123456789",
    "operatorName": "MTN"
  }
}

# Expected: 400 Bad Request with validation error
```

### Test Missing Authentication
```bash
GET http://localhost:3000/wallet/balance
# No Authorization header

# Expected: 401 Unauthorized
```

## Database Verification

You can also check the database directly to verify the wallet system is working:

```javascript
// In MongoDB shell or MongoDB Compass

// Check wallets collection
db.wallets.find({})

// Check transactions collection
db.transactions.find({})

// Check bookings collection
db.bookings.find({ status: "completed" })
```

## Common Issues and Solutions

### Issue: "User not found" or JWT errors
**Solution:** Make sure you're using a valid JWT token for a provider user

### Issue: "Insufficient balance" on first withdrawal
**Solution:** Complete at least one booking first to generate earnings

### Issue: Earnings not showing up
**Solution:** Ensure the booking status is set to "completed" and paymentStatus is "paid"

### Issue: Circular dependency errors
**Solution:** The forwardRef setup should handle this, but restart the server if needed

## Success Indicators

✅ **Wallet created automatically** when first accessed  
✅ **Earnings processed** when booking completed  
✅ **Commission deducted** (10% platform fee)  
✅ **Balance updated** correctly  
✅ **Withdrawal requests** created successfully  
✅ **Transaction history** recorded properly  

The wallet system is now ready for production use!