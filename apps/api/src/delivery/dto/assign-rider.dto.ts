import { IsString, MinLength } from 'class-validator';

export class AssignRiderDto {
  @IsString()
  @MinLength(2)
  courierName: string;

  @IsString()
  @MinLength(5)
  courierPhone: string;
}
