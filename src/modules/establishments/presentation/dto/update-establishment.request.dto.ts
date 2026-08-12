import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EstablishmentAddressDto } from './establishment-address.dto';

export class UpdateEstablishmentRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  slug?: string;

  /** Presentation text for clients. Send an empty string to clear it. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EstablishmentAddressDto)
  address?: EstablishmentAddressDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phones?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationMinHoursNotice?: number;

  @IsOptional()
  @IsBoolean()
  noShowFeeEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  noShowFeePercentage?: number;

  @IsOptional()
  @IsBoolean()
  depositEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  depositPercentage?: number;

  @IsOptional()
  @IsBoolean()
  reminder24hEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  reminder2hEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyEmailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyWhatsappEnabled?: boolean;
}
