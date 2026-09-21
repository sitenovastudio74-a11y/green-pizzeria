import { IsString, MaxLength } from 'class-validator';

export class AdminRespondReviewDto {
  @IsString()
  @MaxLength(500)
  adminResponse: string;
}
