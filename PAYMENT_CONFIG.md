# Payment System Configuration

This document outlines the required environment variables and configuration for the HAS backend payment system supporting MTN Mobile Money and Orange Money.

## Environment Variables

Add these environment variables to your `.env` file:

### MTN Mobile Money Configuration

```env
# MTN Mobile Money API Configuration
MTN_BASE_URL=https://sandbox.momodeveloper.mtn.com
MTN_SUBSCRIPTION_KEY=your-mtn-subscription-key
MTN_API_KEY=your-mtn-api-key
MTN_USER_ID=your-mtn-user-id
```

**Production URLs:**
- Sandbox: `https://sandbox.momodeveloper.mtn.com`
- Production: `https://momodeveloper.mtn.com`

### Orange Money Configuration

```env
# Orange Money API Configuration
ORANGE_BASE_URL=https://api.orange.com
ORANGE_MERCHANT_KEY=your-orange-merchant-key
ORANGE_CLIENT_ID=your-orange-client-id
ORANGE_CLIENT_SECRET=your-orange-client-secret
```

### Application URLs

```env
# Backend URL for webhooks
BASE_URL=https://your-backend-domain.com

# Frontend URL for payment redirects
FRONTEND_URL=https://your-frontend-domain.com
```

## API Provider Setup

### MTN Mobile Money

1. **Create Developer Account**
   - Visit [MTN MoMo Developer Portal](https://momodeveloper.mtn.com)
   - Register for a developer account
   - Create a new application

2. **Sandbox Setup**
   - Get your subscription key from the portal
   - Generate API user and API key
   - Test with sandbox environment first

3. **Production Setup**
   - Complete KYC process
   - Get production credentials
   - Update BASE_URL to production URL

### Orange Money

1. **Create Developer Account**
   - Visit [Orange Developer Portal](https://developer.orange.com)
   - Register for Orange Money API access
   - Create application credentials

2. **Get Merchant Account**
   - Apply for Orange Money merchant account
   - Get merchant key and credentials
   - Configure webhook endpoints

## Webhook Configuration

The system provides these webhook endpoints for payment notifications:

- **MTN Mobile Money**: `POST /api/v1/payments/webhook/mtn`
- **Orange Money**: `POST /api/v1/payments/webhook/orange`

### Webhook Security

Configure webhook signature verification in production:

```env
# Webhook security (optional)
MTN_WEBHOOK_SECRET=your-mtn-webhook-secret
ORANGE_WEBHOOK_SECRET=your-orange-webhook-secret
```

## Testing

### Test Phone Numbers

**MTN Sandbox:**
- Valid: `237670000000` - `237679999999`
- Invalid: `237680000000` - `237689999999`

**Orange Sandbox:**
- Valid: `237650000000` - `237659999999`
- Invalid: `237660000000` - `237669999999`

### Test Amounts

- Success: Any amount ending in `00` (e.g., 1000, 2500)
- Failure: Any amount ending in `01` (e.g., 1001, 2501)

## Payment Flow

1. **Initiate Payment**
   ```bash
   POST /api/v1/payments/initiate
   {
     "bookingId": "booking-id",
     "amount": 25000,
     "provider": "mtn_money",
     "phoneNumber": "+237670123456",
     "accountName": "John Doe"
   }
   ```

2. **Check Payment Status**
   ```bash
   GET /api/v1/payments/status/{paymentReference}
   ```

3. **Webhook Notification**
   - Payment provider sends webhook to your endpoint
   - System automatically updates payment and booking status
   - User can check status or receive real-time updates

## Currency and Amounts

- **Currency**: FCFA (Central African CFA Franc)
- **Minimum Amount**: 100 FCFA
- **Maximum Amount**: 1,000,000 FCFA
- **Commission**: 10% platform fee (automatically deducted)

## Error Handling

Common error scenarios:

1. **Insufficient Balance**: Payment fails due to low account balance
2. **Invalid Phone Number**: Wrong format or inactive number
3. **Network Issues**: Temporary connectivity problems
4. **Expired Payment**: Payment not completed within timeout period
5. **Duplicate Payment**: Attempt to pay for already paid booking

## Monitoring

Monitor payment system health:

- Payment success/failure rates
- Webhook delivery status
- API response times
- Error patterns

## Security Best Practices

1. **Validate Webhooks**: Verify webhook signatures
2. **Secure Credentials**: Store API keys securely
3. **Rate Limiting**: Implement payment rate limits
4. **Logging**: Log all payment transactions
5. **Encryption**: Use HTTPS for all API calls

## Support

For payment system issues:

1. Check logs for error details
2. Verify configuration variables
3. Test with sandbox environment
4. Contact API provider support if needed

## Production Checklist

Before going live:

- [ ] Production API credentials configured
- [ ] Webhook URLs updated to production
- [ ] SSL certificates installed
- [ ] Payment testing completed
- [ ] Error handling tested
- [ ] Monitoring setup
- [ ] Security review completed