import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WithdrawalMethod } from '../schemas/transaction.schema';
import { ApiProperty } from '@nestjs/swagger';

class WithdrawalDetailsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  accountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  accountName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  mobileNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  operatorName?: string;
}

export class CreateWithdrawalDto {
  @ApiProperty({ description: 'Amount to withdraw in FCFA', minimum: 1000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1000, { message: 'Minimum withdrawal amount is 1000 FCFA' })
  amount: number;

  @ApiProperty({ enum: WithdrawalMethod })
  @IsNotEmpty()
  @IsEnum(WithdrawalMethod)
  withdrawalMethod: WithdrawalMethod;

  @ApiProperty({ type: WithdrawalDetailsDto })
  @ValidateNested()
  @Type(() => WithdrawalDetailsDto)
  withdrawalDetails: WithdrawalDetailsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  description?: string;
}
