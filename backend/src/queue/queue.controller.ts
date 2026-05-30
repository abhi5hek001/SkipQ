import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  getVendorQueue(@CurrentUser() user: any, @Query('shopId') shopId: string) {
    return this.queueService.getVendorQueue(user.id, shopId);
  }

  @Patch(':orderId/advance')
  advanceStatus(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    return this.queueService.advanceStatus(user.id, orderId);
  }

  @Patch(':orderId/cancel')
  vendorCancel(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    return this.queueService.vendorCancel(user.id, orderId);
  }
}
