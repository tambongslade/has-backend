import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  SEEKER = 'seeker',
  PROVIDER = 'provider',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phoneNumber?: string;

  @Prop({
    type: String,
    enum: UserRole,
    required: false,
    default: null,
  })
  role?: UserRole | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
