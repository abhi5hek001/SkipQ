import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get('my')
  findMyOrders(@CurrentUser() user: any) {
    return this.ordersService.findMyOrders(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findOne(id, user.id);
  }

  // Dev-only — replaced by Razorpay webhook in Phase 5
  @Patch(':id/mock-pay')
  mockPay(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.mockPay(id, user.id);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.cancel(id, user.id);
  }
}
