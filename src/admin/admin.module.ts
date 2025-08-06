import { Module, DynamicModule } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { Session, SessionSchema } from '../bookings/schemas/session.schema';
import {
  Availability,
  AvailabilitySchema,
} from '../bookings/schemas/availability.schema';
import {
  SessionConfig,
  SessionConfigSchema,
} from '../config/session-config.schema';
import { Payment, PaymentSchema } from '../wallet/schemas/payment.schema';
import {
  ProviderReview,
  ProviderReviewSchema,
} from '../users/schemas/provider-review.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import {
  Transaction,
  TransactionSchema,
} from '../wallet/schemas/transaction.schema';
import { Model } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: SessionConfig.name, schema: SessionConfigSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: ProviderReview.name, schema: ProviderReviewSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
})
export class AdminPanelModule {
  static async forRootAsync(): Promise<DynamicModule> {
    // AdminJS version 7 is ESM-only. Use dynamic imports with Promise.all()
    const [{ AdminModule }, { Database, Resource }, { default: AdminJS }] =
      await Promise.all([
        import('@adminjs/nestjs'),
        import('@adminjs/mongoose'),
        import('adminjs'),
      ]);

    // Register the Mongoose adapter
    AdminJS.registerAdapter({ Resource, Database });

    const adminModule = AdminModule.createAdminAsync({
      imports: [
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Booking.name, schema: BookingSchema },
          { name: Session.name, schema: SessionSchema },
          { name: Availability.name, schema: AvailabilitySchema },
          { name: SessionConfig.name, schema: SessionConfigSchema },
          { name: Payment.name, schema: PaymentSchema },
          { name: ProviderReview.name, schema: ProviderReviewSchema },
          { name: Service.name, schema: ServiceSchema },
          { name: Wallet.name, schema: WalletSchema },
          { name: Transaction.name, schema: TransactionSchema },
        ]),
      ],
      useFactory: (
        userModel: Model<User>,
        bookingModel: Model<Booking>,
        sessionModel: Model<Session>,
        availabilityModel: Model<Availability>,
        sessionConfigModel: Model<SessionConfig>,
        paymentModel: Model<Payment>,
        providerReviewModel: Model<ProviderReview>,
        serviceModel: Model<Service>,
        walletModel: Model<Wallet>,
        transactionModel: Model<Transaction>,
      ) => ({
        adminJsOptions: {
          rootPath: '/admin',
          resources: [
            {
              resource: userModel,
              options: {
                navigation: { name: 'User Management', icon: 'User' },
                listProperties: ['fullName', 'email', 'role', 'createdAt'],
                showProperties: [
                  'fullName',
                  'email',
                  'phoneNumber',
                  'role',
                  'isActive',
                  'createdAt',
                  'updatedAt',
                ],
                filterProperties: ['fullName', 'email', 'role', 'isActive'],
                editProperties: [
                  'fullName',
                  'email',
                  'phoneNumber',
                  'role',
                  'isActive',
                ],
                properties: {
                  password: { isVisible: false },
                  createdAt: { type: 'datetime' },
                  updatedAt: { type: 'datetime' },
                },
              },
            },
            {
              resource: bookingModel,
              options: {
                navigation: { name: 'Bookings', icon: 'Calendar' },
                listProperties: [
                  'seekerId',
                  'providerId',
                  'status',
                  'paymentStatus',
                  'totalAmount',
                  'bookingDate',
                  'createdAt',
                ],
                showProperties: [
                  'seekerId',
                  'providerId',
                  'serviceId',
                  'status',
                  'paymentStatus',
                  'totalAmount',
                  'bookingDate',
                  'startTime',
                  'endTime',
                  'duration',
                  'specialInstructions',
                  'createdAt',
                ],
                filterProperties: ['status', 'paymentStatus', 'bookingDate'],
                properties: {
                  totalAmount: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  bookingDate: { type: 'datetime' },
                  createdAt: { type: 'datetime' },
                  updatedAt: { type: 'datetime' },
                },
              },
            },
            {
              resource: paymentModel,
              options: {
                navigation: { name: 'Payments', icon: 'CreditCard' },
                listProperties: [
                  'paymentReference',
                  'amount',
                  'provider',
                  'status',
                  'payerId',
                  'createdAt',
                ],
                showProperties: [
                  'paymentReference',
                  'amount',
                  'provider',
                  'status',
                  'payerId',
                  'receiverId',
                  'bookingId',
                  'paymentDetails',
                  'createdAt',
                  'processedAt',
                ],
                filterProperties: ['provider', 'status', 'createdAt'],
                editProperties: ['status', 'failureReason'],
                properties: {
                  amount: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  createdAt: { type: 'datetime' },
                  processedAt: { type: 'datetime' },
                  paymentDetails: { type: 'mixed' },
                  providerMetadata: { type: 'mixed' },
                },
              },
            },
            {
              resource: providerReviewModel,
              options: {
                navigation: { name: 'Reviews', icon: 'Star' },
                listProperties: [
                  'providerId',
                  'reviewerId',
                  'rating',
                  'status',
                  'serviceCategory',
                  'createdAt',
                ],
                showProperties: [
                  'providerId',
                  'reviewerId',
                  'rating',
                  'comment',
                  'status',
                  'serviceCategory',
                  'relatedBookingId',
                  'providerResponse',
                  'createdAt',
                ],
                filterProperties: ['rating', 'status', 'serviceCategory'],
                editProperties: ['status', 'moderationInfo'],
                properties: {
                  rating: {
                    type: 'number',
                    props: { min: 1, max: 5 },
                  },
                  createdAt: { type: 'datetime' },
                  updatedAt: { type: 'datetime' },
                },
              },
            },
            {
              resource: sessionModel,
              options: {
                navigation: { name: 'Sessions', icon: 'Calendar' },
                listProperties: [
                  'seekerId',
                  'providerId',
                  'serviceName',
                  'category',
                  'status',
                  'paymentStatus',
                  'totalAmount',
                  'sessionDate',
                  'createdAt',
                ],
                showProperties: [
                  'seekerId',
                  'providerId',
                  'serviceId',
                  'serviceName',
                  'category',
                  'status',
                  'paymentStatus',
                  'sessionDate',
                  'startTime',
                  'endTime',
                  'baseDuration',
                  'overtimeHours',
                  'basePrice',
                  'overtimePrice',
                  'totalAmount',
                  'currency',
                  'notes',
                  'createdAt',
                ],
                filterProperties: [
                  'status',
                  'paymentStatus',
                  'category',
                  'sessionDate',
                ],
                editProperties: ['status', 'paymentStatus', 'notes'],
                properties: {
                  totalAmount: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  basePrice: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  overtimePrice: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  sessionDate: { type: 'datetime' },
                  createdAt: { type: 'datetime' },
                  updatedAt: { type: 'datetime' },
                },
              },
            },
            {
              resource: availabilityModel,
              options: {
                navigation: { name: 'Availability', icon: 'Clock' },
                listProperties: [
                  'providerId',
                  'dayOfWeek',
                  'timeSlots',
                  'isActive',
                  'createdAt',
                ],
                showProperties: [
                  'providerId',
                  'dayOfWeek',
                  'timeSlots',
                  'isActive',
                  'notes',
                  'createdAt',
                  'updatedAt',
                ],
                filterProperties: ['dayOfWeek', 'isActive'],
                editProperties: ['timeSlots', 'isActive', 'notes'],
                properties: {
                  timeSlots: { type: 'mixed' },
                  createdAt: { type: 'datetime' },
                  updatedAt: { type: 'datetime' },
                },
              },
            },
            {
              resource: sessionConfigModel,
              options: {
                navigation: { name: 'Session Config', icon: 'Settings' },
                listProperties: [
                  'categoryPricing',
                  'defaultSessionDuration',
                  'currency',
                  'isActive',
                  'createdAt',
                ],
                showProperties: [
                  'categoryPricing',
                  'defaultSessionDuration',
                  'defaultOvertimeIncrement',
                  'currency',
                  'isActive',
                  'notes',
                  'createdAt',
                  'updatedAt',
                ],
                filterProperties: ['isActive'],
                editProperties: [
                  'categoryPricing',
                  'defaultSessionDuration',
                  'defaultOvertimeIncrement',
                  'isActive',
                  'notes',
                ],
                properties: {
                  categoryPricing: { type: 'mixed' },
                  createdAt: { type: 'datetime' },
                  updatedAt: { type: 'datetime' },
                },
              },
            },
            {
              resource: serviceModel,
              options: {
                navigation: { name: 'Services', icon: 'Grid' },
                listProperties: [
                  'title',
                  'category',
                  'providerId',
                  'isAvailable',
                  'averageRating',
                  'totalReviews',
                  'status',
                ],
                showProperties: [
                  'title',
                  'description',
                  'category',
                  'providerId',
                  'isAvailable',
                  'averageRating',
                  'totalReviews',
                  'status',
                  'location',
                  'tags',
                  'images',
                  'createdAt',
                ],
                filterProperties: [
                  'category',
                  'isAvailable',
                  'status',
                  'location',
                ],
                editProperties: [
                  'title',
                  'description',
                  'isAvailable',
                  'status',
                ],
                properties: {
                  averageRating: {
                    type: 'number',
                    props: { min: 0, max: 5, step: 0.1 },
                  },
                  images: { type: 'mixed' },
                  tags: { type: 'mixed' },
                  createdAt: { type: 'datetime' },
                  updatedAt: { type: 'datetime' },
                },
              },
            },
            {
              resource: walletModel,
              options: {
                navigation: { name: 'Wallets', icon: 'Wallet' },
                listProperties: [
                  'providerId',
                  'balance',
                  'pendingBalance',
                  'totalEarnings',
                  'totalWithdrawn',
                  'isActive',
                ],
                showProperties: [
                  'providerId',
                  'balance',
                  'pendingBalance',
                  'totalEarnings',
                  'totalWithdrawn',
                  'currency',
                  'isActive',
                  'createdAt',
                  'updatedAt',
                ],
                filterProperties: ['isActive', 'balance'],
                editProperties: ['isActive'],
                properties: {
                  balance: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  pendingBalance: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  totalEarnings: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  totalWithdrawn: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  createdAt: { type: 'datetime' },
                  updatedAt: { type: 'datetime' },
                },
              },
            },
            {
              resource: transactionModel,
              options: {
                navigation: { name: 'Transactions', icon: 'DollarSign' },
                listProperties: [
                  'providerId',
                  'type',
                  'amount',
                  'status',
                  'description',
                  'createdAt',
                ],
                showProperties: [
                  'providerId',
                  'type',
                  'amount',
                  'status',
                  'description',
                  'bookingId',
                  'withdrawalMethod',
                  'transactionReference',
                  'processedAt',
                  'createdAt',
                ],
                filterProperties: ['type', 'status', 'withdrawalMethod'],
                editProperties: ['status', 'failureReason'],
                properties: {
                  amount: {
                    type: 'number',
                    props: { suffix: ' FCFA' },
                  },
                  createdAt: { type: 'datetime' },
                  processedAt: { type: 'datetime' },
                  withdrawalDetails: { type: 'mixed' },
                },
              },
            },
          ],
          branding: {
            companyName: 'HAS - House Service Platform',
            softwareBrothers: false,
            withMadeWithLove: false,
          },
          dashboard: {
            handler: async () => {
              return {
                message:
                  'Welcome to HAS Admin Dashboard - Session-Based Booking System',
                stats: {
                  totalUsers: '👥 Check User Management',
                  totalServices: '🛠️ Check Services',
                  totalSessions: '📅 Check Sessions (New)',
                  legacyBookings: '📋 Check Legacy Bookings',
                  totalPayments: '💳 Check Payments',
                  availability: '⏰ Check Provider Availability',
                  sessionConfig: '⚙️ Check Session Configuration (3,000 FCFA)',
                  totalWallets: '💰 Check Wallets & Earnings',
                  totalReviews: '⭐ Check Reviews',
                },
              };
            },
          },
        },
        auth: {
          authenticate: async (email: string, password: string) => {
            if (email === 'admin@has.com' && password === 'admin123') {
              return {
                email: 'admin@has.com',
                role: 'admin',
                name: 'HAS Administrator',
              };
            }
            return null;
          },
          cookieName: 'adminjs',
          cookiePassword: 'secret-change-this-in-production-with-env-variable',
        },
        sessionOptions: {
          resave: true,
          saveUninitialized: true,
          secret: 'secret-change-this-in-production-with-env-variable',
        },
      }),
      inject: [
        getModelToken(User.name),
        getModelToken(Booking.name),
        getModelToken(Session.name),
        getModelToken(Availability.name),
        getModelToken(SessionConfig.name),
        getModelToken(Payment.name),
        getModelToken(ProviderReview.name),
        getModelToken(Service.name),
        getModelToken(Wallet.name),
        getModelToken(Transaction.name),
      ],
    });

    return {
      module: AdminPanelModule,
      imports: [
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Booking.name, schema: BookingSchema },
          { name: Session.name, schema: SessionSchema },
          { name: Availability.name, schema: AvailabilitySchema },
          { name: SessionConfig.name, schema: SessionConfigSchema },
          { name: Payment.name, schema: PaymentSchema },
          { name: ProviderReview.name, schema: ProviderReviewSchema },
          { name: Service.name, schema: ServiceSchema },
          { name: Wallet.name, schema: WalletSchema },
          { name: Transaction.name, schema: TransactionSchema },
        ]),
        adminModule,
      ],
    };
  }
}
