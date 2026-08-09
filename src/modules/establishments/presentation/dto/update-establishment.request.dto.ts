import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
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
}
