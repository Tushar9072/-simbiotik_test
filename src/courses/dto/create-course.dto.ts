import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'CS101' })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiProperty({ example: 'Introduction to Computer Science' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({
    example: 'Core programming and computing concepts.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  credits: number;

  @ApiProperty({ example: 30, minimum: 1 })
  @IsInt()
  @Min(1)
  maxCapacity: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
