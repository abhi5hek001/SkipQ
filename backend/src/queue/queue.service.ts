import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { OrderStatus } from '@prisma/client';

// Valid vendor-driven transitions
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.QUEUED]: OrderStatus.ACCEPTED,
  [OrderStatus.ACCEPTED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.COMPLETED,
};

// QueueEntry timestamp field to set per transition
const TRANSITION_TIMESTAMP: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.ACCEPTED]: 'acceptedAt',
  [OrderStatus.PREPARING]: 'preparingAt',
  [OrderStatus.READY]: 'readyAt',
  [OrderStatus.COMPLETED]: 'completedAt',
};

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async getVendorQueue(userId: string, shopId: string) {
    await this.assertShopOwnership(userId, shopId);

    const entries = await this.prisma.queueEntry.findMany({
      where: {
        shopId,
        order: { status: { in: [OrderStatus.QUEUED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY] } },
      },
      include: {
        order: {
          include: {
            customer: { select: { phone: true, name: true } },
            orderItems: true,
          },
        },
      },
      orderBy: { tokenNumber: 'asc' },
    });

    return entries.map((entry, idx) => ({
      ...entry,
      queuePosition: idx,
    }));
  }

  async advanceStatus(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shop: { select: { vendor: { select: { userId: true } }, avgPrepTimeMins: true } }, queueEntry: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.shop.vendor.userId !== userId) throw new ForbiddenException('Not your shop');

    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) {
      throw new BadRequestException(`Cannot advance order from ${order.status}`);
    }

    const timestampField = TRANSITION_TIMESTAMP[nextStatus];
    const now = new Date();

    const [updatedOrder] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
      }),
      ...(order.queueEntry && timestampField
        ? [this.prisma.queueEntry.update({
            where: { id: order.queueEntry.id },
            data: { [timestampField]: now },
          })]
        : []),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'ORDER_STATUS_CHANGED',
          entity: 'Order',
          entityId: orderId,
          before: { status: order.status },
          after: { status: nextStatus },
        },
      }),
    ]);

    this.events.emitOrderStatusChanged(orderId, { status: nextStatus });
    this.events.emitQueueOrderUpdated(order.shop.vendor.userId, { orderId, status: nextStatus });

    return updatedOrder;
  }

  async vendorCancel(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shop: { select: { vendor: { select: { userId: true } } } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.shop.vendor.userId !== userId) throw new ForbiddenException('Not your shop');

    const cancellable: OrderStatus[] = [OrderStatus.QUEUED, OrderStatus.ACCEPTED];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order in ${order.status} state`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'ORDER_CANCELLED_BY_VENDOR',
          entity: 'Order',
          entityId: orderId,
          before: { status: order.status },
          after: { status: OrderStatus.CANCELLED },
        },
      }),
    ]);

    this.events.emitOrderStatusChanged(orderId, { status: OrderStatus.CANCELLED });

    return updated;
  }

  private async assertShopOwnership(userId: string, shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { vendor: { select: { userId: true } } },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.vendor.userId !== userId) throw new ForbiddenException('Not your shop');
  }
}
