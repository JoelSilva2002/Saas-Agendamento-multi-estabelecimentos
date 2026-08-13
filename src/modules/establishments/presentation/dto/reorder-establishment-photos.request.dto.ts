import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ReorderEstablishmentPhotosRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  photoIds!: string[];
}
