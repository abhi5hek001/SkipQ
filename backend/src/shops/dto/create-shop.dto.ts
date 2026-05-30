import { IsString, IsOptional, IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShopDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tokenAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  avgPrepTimeMins?: number;
}
