import {
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const URL_OPTS = { protocols: ['http', 'https'], require_protocol: true };

export class CreateTestimonialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  comment: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  source: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  photoUrl?: string | null;

  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  linkUrl?: string | null;
}

export class UpdateTestimonialDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  photoUrl?: string | null;

  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  linkUrl?: string | null;
}

export class ReorderTestimonialsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids: string[];
}