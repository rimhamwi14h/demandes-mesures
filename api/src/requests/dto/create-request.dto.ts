import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { MeasurementType } from "../../generated/prisma/client.js";

export class SampleDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reference!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class CreateRequestDto {
  @IsEnum(MeasurementType)
  measurementType!: MeasurementType;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  desiredDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((sample: SampleDto) => sample.reference)
  @ValidateNested({ each: true })
  @Type(() => SampleDto)
  samples!: SampleDto[];
}