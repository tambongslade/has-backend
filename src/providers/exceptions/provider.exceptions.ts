import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

export class InsufficientBalanceException extends BadRequestException {
  constructor(available: number, requested: number) {
    super({
      message: `Insufficient balance. Available: ${available} FCFA, Requested: ${requested} FCFA`,
      error: 'InsufficientBalance',
      statusCode: 400,
      available,
      requested,
    });
  }
}

export class WithdrawalLimitExceededException extends BadRequestException {
  constructor(
    limit: number,
    amount: number,
    limitType: 'daily' | 'monthly' | 'transaction',
  ) {
    const limitTypeText =
      limitType === 'transaction' ? 'per transaction' : limitType;
    super({
      message: `Withdrawal amount ${amount} FCFA exceeds ${limitTypeText} limit of ${limit} FCFA`,
      error: 'WithdrawalLimitExceeded',
      statusCode: 400,
      limit,
      amount,
      limitType,
    });
  }
}

export class InvalidWithdrawalMethodException extends BadRequestException {
  constructor(method: string, validMethods: string[]) {
    super({
      message: `Invalid withdrawal method: ${method}. Valid methods: ${validMethods.join(', ')}`,
      error: 'InvalidWithdrawalMethod',
      statusCode: 400,
      providedMethod: method,
      validMethods,
    });
  }
}

export class WithdrawalNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      message: `Withdrawal request with ID ${id} not found`,
      error: 'WithdrawalNotFound',
      statusCode: 404,
      withdrawalId: id,
    });
  }
}

export class WithdrawalAlreadyProcessedException extends BadRequestException {
  constructor(id: string, currentStatus: string) {
    super({
      message: `Withdrawal request ${id} has already been processed with status: ${currentStatus}`,
      error: 'WithdrawalAlreadyProcessed',
      statusCode: 400,
      withdrawalId: id,
      currentStatus,
    });
  }
}

export class InvalidPaymentDetailsException extends BadRequestException {
  constructor(method: string, missingFields: string[]) {
    super({
      message: `Invalid payment details for ${method}. Missing required fields: ${missingFields.join(', ')}`,
      error: 'InvalidPaymentDetails',
      statusCode: 400,
      withdrawalMethod: method,
      missingFields,
    });
  }
}

export class ProviderNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      message: `Provider with ID ${id} not found`,
      error: 'ProviderNotFound',
      statusCode: 404,
      providerId: id,
    });
  }
}

export class WalletNotFoundException extends NotFoundException {
  constructor(providerId: string) {
    super({
      message: `Wallet not found for provider ${providerId}`,
      error: 'WalletNotFound',
      statusCode: 404,
      providerId,
    });
  }
}

export class AnalyticsDataNotFoundException extends NotFoundException {
  constructor(providerId: string, period: string) {
    super({
      message: `No analytics data found for provider ${providerId} in period ${period}`,
      error: 'AnalyticsDataNotFound',
      statusCode: 404,
      providerId,
      period,
    });
  }
}

export class BookingNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      message: `Booking with ID ${id} not found`,
      error: 'BookingNotFound',
      statusCode: 404,
      bookingId: id,
    });
  }
}

export class UnauthorizedAccessException extends ForbiddenException {
  constructor(resource: string, providerId: string) {
    super({
      message: `Unauthorized access to ${resource} for provider ${providerId}`,
      error: 'UnauthorizedAccess',
      statusCode: 403,
      resource,
      providerId,
    });
  }
}

export class InvalidDateRangeException extends BadRequestException {
  constructor(startDate: string, endDate: string) {
    super({
      message: `Invalid date range: start date ${startDate} must be before end date ${endDate}`,
      error: 'InvalidDateRange',
      statusCode: 400,
      startDate,
      endDate,
    });
  }
}

export class InvalidPeriodException extends BadRequestException {
  constructor(period: string, validPeriods: string[]) {
    super({
      message: `Invalid period: ${period}. Valid periods: ${validPeriods.join(', ')}`,
      error: 'InvalidPeriod',
      statusCode: 400,
      providedPeriod: period,
      validPeriods,
    });
  }
}
