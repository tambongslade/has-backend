import { Module, DynamicModule } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';
import { Session, SessionSchema } from '../bookings/schemas/session.schema';

@Module({})
export class AdminPanelSimpleModule {
  static async forRootAsync(): Promise<DynamicModule> {
    try {
      // Use dynamic import for ESM compatibility with AdminJS 7
      const [{ default: AdminJS }, { AdminModule }, { Resource, Database }] =
        await Promise.all([
          import('adminjs'),
          import('@adminjs/nestjs'),
          import('@adminjs/mongoose'),
        ]);

      // Register the Mongoose adapter
      AdminJS.registerAdapter({ Resource, Database });

      const adminModule = AdminModule.createAdminAsync({
        imports: [
          MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Service.name, schema: ServiceSchema },
            { name: Session.name, schema: SessionSchema },
          ]),
        ],
        useFactory: (userModel: any, serviceModel: any, sessionModel: any) => ({
          adminJsOptions: {
            rootPath: '/admin',
            resources: [
              {
                resource: userModel,
                options: {
                  navigation: { name: 'Users', icon: 'User' },
                  listProperties: ['fullName', 'email', 'role', 'createdAt'],
                  properties: {
                    password: { isVisible: false },
                    createdAt: { type: 'datetime' },
                    updatedAt: { type: 'datetime' },
                  },
                },
              },
              {
                resource: serviceModel,
                options: {
                  navigation: { name: 'Services', icon: 'Settings' },
                  listProperties: [
                    'title',
                    'category',
                    'providerId',
                    'isAvailable',
                  ],
                  properties: {
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
                    'serviceName',
                    'status',
                    'totalAmount',
                    'sessionDate',
                  ],
                  properties: {
                    totalAmount: {
                      type: 'number',
                      props: { suffix: ' FCFA' },
                    },
                    sessionDate: { type: 'datetime' },
                    createdAt: { type: 'datetime' },
                    updatedAt: { type: 'datetime' },
                  },
                },
              },
            ],
            branding: {
              companyName: 'HAS - House Service Platform',
              softwareBrothers: false,
            },
          },
          auth: {
            authenticate: async (email: string, password: string) => {
              if (email === 'admin@has.com' && password === 'admin123') {
                return { email: 'admin@has.com', role: 'admin' };
              }
              return null;
            },
            cookieName: 'adminjs',
            cookiePassword: 'secret-key',
          },
          sessionOptions: {
            resave: true,
            saveUninitialized: true,
            secret: 'secret-key',
          },
        }),
        inject: [
          getModelToken(User.name),
          getModelToken(Service.name),
          getModelToken(Session.name),
        ],
      });

      return {
        module: AdminPanelSimpleModule,
        imports: [
          MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Service.name, schema: ServiceSchema },
            { name: Session.name, schema: SessionSchema },
          ]),
          adminModule,
        ],
      };
    } catch (error) {
      console.error('AdminJS setup failed:', error);
      // Return empty module if AdminJS fails
      return {
        module: AdminPanelSimpleModule,
        imports: [],
      };
    }
  }
}
