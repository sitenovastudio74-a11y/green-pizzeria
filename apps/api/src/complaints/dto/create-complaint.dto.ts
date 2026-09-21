import { IsUUID, IsString, MaxLength } from 'class-validator';

export class CreateComplaintDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @MaxLength(150)
  subject: string;

  @IsString()
  @MaxLength(1000)
  description: string;
}
