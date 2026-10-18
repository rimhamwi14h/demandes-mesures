import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class AssignManagerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  userId!: string;
}