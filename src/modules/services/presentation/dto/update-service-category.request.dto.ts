import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateServiceCategoryRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
