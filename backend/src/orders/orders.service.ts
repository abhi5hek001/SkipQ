import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.QUEUED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (!shop.isOpen) throw new BadRequestException('Shop is currently closed');

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: dto.items.map((i) => i.menuItemId) }, shopId: dto.shopId },
    });

    if (menuItems.length !== dto.items.length) {
      throw new BadRequestException('One or more items are invalid or unavailable for this shop');
    }

    const unavailable = menuItems.filter((m) => !m.isAvailable);
    if (unavailable.length > 0) {
      throw new BadRequestException(
        `Items unavailable: ${unavailable.map((i) => i.name).join(', ')}`,
      );
    }

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));
    const orderItemsData = dto.items.map((i) => {
      const menu = itemMap.get(i.menuItemId)!;
      return {
        menuItemId: i.menuItemId,
        name: menu.name,
        price: menu.price,
        quantity: i.quantity,
        subtotal: Number(menu.price) * i.quantity,
      };
    });

    const PLATFORM_FEE = 5;
    const itemsTotal = orderItemsData.reduce((sum, i) => sum + i.subtotal, 0);
    // totalAmount = what the customer is charged (food + platform fee)
    // tokenAmount = platform fee portion that stays with SkipQ
    // remainingAmount = 0: full payment is collected upfront; vendor receives food portion via Razorpay Route
    const totalAmount = itemsTotal + PLATFORM_FEE;
    const tokenAmount = PLATFORM_FEE;
    const remainingAmount = 0;

    return this.prisma.order.create({
      data: {
        shopId: dto.shopId,
        customerId,
        totalAmount,
        tokenAmount,
        remainingAmount,
        notes: dto.notes,
        orderItems: { create: orderItemsData },
      },
      include: { orderItems: true, shop: { select: { name: true, tokenAmount: true } } },
    });
  }

  async findOne(orderId: string, requesterId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        queueEntry: true,
        shop: { select: { name: true, avgPrepTimeMins: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== requesterId) throw new ForbiddenException();

    const queuePosition = order.queueEntry
      ? await this.computePosition(order.shopId, order.queueEntry.joinedAt)
      : null;

    const estimatedWaitMins = queuePosition !== null
      ? queuePosition * order.shop.avgPrepTimeMins
      : null;

    return { ...order, queuePosition, estimatedWaitMins };
  }

  async findMyOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { orderItems: true, shop: { select: { name: true } }, queueEntry: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Dev-only: simulates token payment confirmation (replaced by Razorpay webhook in Phase 5)
  async mockPay(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException();
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const { nextToken, tokenDisplay } = await this.nextTokenNumber(order.shopId);

    const [updatedOrder, entry] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.QUEUED, paidAmount: order.tokenAmount },
      }),
      this.prisma.queueEntry.create({
        data: {
          shopId: order.shopId,
          orderId,
          tokenNumber: nextToken,
          tokenDisplay,
          position: nextToken,
          joinedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: customerId,
          action: 'ORDER_STATUS_CHANGED',
          entity: 'Order',
          entityId: orderId,
          before: { status: OrderStatus.PENDING_PAYMENT },
          after: { status: OrderStatus.QUEUED },
        },
      }),
    ]);

    const queuePosition = await this.computePosition(order.shopId, entry.joinedAt);
    this.events.emitOrderStatusChanged(orderId, { status: OrderStatus.QUEUED, queuePosition });
    this.events.emitQueueNewOrder(order.shopId, { orderId, tokenDisplay: entry.tokenDisplay, totalAmount: order.totalAmount });

    return { ...updatedOrder, queueEntry: entry, queuePosition };
  }

  async cancel(orderId: string, requesterId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== requesterId) throw new ForbiddenException();

    const cancellable: OrderStatus[] = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.QUEUED,
      OrderStatus.ACCEPTED,
    ];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order in ${order.status} state`);
    }

    const updated = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: requesterId,
          action: 'ORDER_CANCELLED',
          entity: 'Order',
          entityId: orderId,
          before: { status: order.status },
          after: { status: OrderStatus.CANCELLED },
        },
      }),
    ]);

    this.events.emitOrderStatusChanged(orderId, { status: OrderStatus.CANCELLED });

    return updated[0];
  }

  async computePosition(shopId: string, joinedAt: Date): Promise<number> {
    return this.prisma.queueEntry.count({
      where: {
        shopId,
        joinedAt: { lt: joinedAt },
        order: { status: { in: ACTIVE_STATUSES } },
      },
    });
  }

  private async nextTokenNumber(shopId: string): Promise<{ nextToken: number; tokenDisplay: string }> {
    const agg = await this.prisma.queueEntry.aggregate({
      where: { shopId },
      _max: { tokenNumber: true },
    });
    const nextToken = (agg._max.tokenNumber ?? 0) + 1;
    const tokenDisplay = 'A' + String(nextToken).padStart(3, '0');
    return { nextToken, tokenDisplay };
  }
}
