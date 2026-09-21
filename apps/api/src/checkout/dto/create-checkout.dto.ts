import { IsUUID, IsOptional, IsString, IsEnum, MaxLength, ValidateIf } from 'class-validator';
import { PaymentMethod, OrderType } from '@prisma/client';

export class CreateCheckoutDto {
  @IsEnum(OrderType)
  orderType: OrderType;

  @ValidateIf((dto) => dto.orderType === OrderType.DELIVERY)
  @IsUUID()
  addressId?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  specialInstructions?: string;
}
