import { IsString, IsArray, ValidateNested, IsInt, IsPositive, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemInput {
  @IsString()
  menuItemId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  shopId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];

  @IsOptional()
  @IsString()
  notes?: string;
}
