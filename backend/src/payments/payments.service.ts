import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import Razorpay from 'razorpay';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus, PaymentStatus, PaymentType, RefundStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: Razorpay;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly events: EventsService,
    private readonly notifications: NotificationsService,
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID ?? '',
      key_secret: process.env.RAZORPAY_KEY_SECRET ?? '',
    });
  }

  async createTokenPayment(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException();
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const existing = await this.prisma.payment.findFirst({
      where: { orderId, type: PaymentType.TOKEN, status: PaymentStatus.PENDING },
    });
    if (existing) {
      return this.buildPaymentResponse(existing);
    }

    // Charge full amount: food cost + Rs. 5 platform fee
    const amountPaise = Math.round(Number(order.totalAmount) * 100);
    const rzpOrder = await this.razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `tok_${orderId.slice(0, 16)}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        razorpayOrderId: rzpOrder.id,
        type: PaymentType.TOKEN,
        amount: order.tokenAmount,
        status: PaymentStatus.PENDING,
      },
    });

    return this.buildPaymentResponse(payment);
  }

  async createRemainingPayment(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException();
    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('Order must be READY before paying remaining balance');
    }
    if (Number(order.remainingAmount) <= 0) {
      throw new BadRequestException('No remaining balance for this order');
    }

    const existing = await this.prisma.payment.findFirst({
      where: { orderId, type: PaymentType.REMAINING, status: PaymentStatus.PENDING },
    });
    if (existing) return this.buildPaymentResponse(existing);

    const amountPaise = Math.round(Number(order.remainingAmount) * 100);
    const rzpOrder = await this.razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `rem_${orderId.slice(0, 16)}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        razorpayOrderId: rzpOrder.id,
        type: PaymentType.REMAINING,
        amount: order.remainingAmount,
        status: PaymentStatus.PENDING,
      },
    });

    return this.buildPaymentResponse(payment);
  }

  // Webhook handler — sole source of truth. Frontend payment status is never trusted.
  async handleWebhook(rawBody: Buffer, signature: string) {
    this.verifySignature(rawBody, signature);

    const event = JSON.parse(rawBody.toString()) as {
      event: string;
      payload: {
        payment?: { entity: { id: string; order_id: string } };
        refund?: { entity: { id: string; payment_id: string } };
      };
    };

    this.logger.log(`Razorpay webhook: ${event.event}`);

    switch (event.event) {
      case 'payment.captured':
        await this.onPaymentCaptured(event.payload.payment!.entity);
        break;
      case 'payment.failed':
        await this.onPaymentFailed(event.payload.payment!.entity);
        break;
      case 'refund.processed':
        await this.onRefundProcessed(event.payload.refund!.entity);
        break;
      default:
        this.logger.log(`Unhandled event: ${event.event}`);
    }

    return { received: true };
  }

  async initiateRefund(orderId: string, requesterId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== requesterId) throw new ForbiddenException();
    if (order.status !== OrderStatus.CANCELLED) {
      throw new BadRequestException('Order must be CANCELLED before refund can be initiated');
    }

    const capturedPayment = await this.prisma.payment.findFirst({
      where: { orderId, status: PaymentStatus.CAPTURED },
    });
    if (!capturedPayment) throw new BadRequestException('No captured payment found to refund');
    if (!capturedPayment.razorpayPaymentId) throw new BadRequestException('Payment ID missing');

    const existingRefund = await this.prisma.refund.findFirst({ where: { orderId } });
    if (existingRefund) throw new ConflictException('Refund already initiated');

    const amountPaise = Math.round(Number(capturedPayment.amount) * 100);
    const rzpRefund = await this.razorpay.payments.refund(capturedPayment.razorpayPaymentId, {
      amount: amountPaise,
    });

    const [refund] = await this.prisma.$transaction([
      this.prisma.refund.create({
        data: {
          orderId,
          paymentId: capturedPayment.id,
          razorpayRefundId: rzpRefund.id,
          amount: capturedPayment.amount,
          reason: 'Customer cancellation',
          status: RefundStatus.INITIATED,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: requesterId,
          action: 'REFUND_INITIATED',
          entity: 'Order',
          entityId: orderId,
          after: { refundId: rzpRefund.id, amount: capturedPayment.amount },
        },
      }),
    ]);

    return refund;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private verifySignature(rawBody: Buffer, signature: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
    const generated = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (generated !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  private async onPaymentCaptured(entity: { id: string; order_id: string }) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: entity.order_id },
    });
    if (!payment) {
      this.logger.warn(`Payment not found for Razorpay order: ${entity.order_id}`);
      return;
    }

    // Idempotency: already processed
    if (payment.razorpayPaymentId) {
      this.logger.log(`Duplicate webhook for payment ${entity.id}, skipping`);
      return;
    }

    const order = await this.prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!order) return;

    const now = new Date();

    if (payment.type === PaymentType.TOKEN) {
      const { nextToken, tokenDisplay } = await this.nextTokenNumber(order.shopId);

      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            razorpayPaymentId: entity.id,
            status: PaymentStatus.CAPTURED,
            capturedAt: now,
            webhookPayload: entity as object,
          },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.QUEUED,
            paidAmount: { increment: payment.amount },
          },
        }),
        this.prisma.queueEntry.create({
          data: {
            shopId: order.shopId,
            orderId: order.id,
            tokenNumber: nextToken,
            tokenDisplay,
            position: nextToken,
            joinedAt: now,
          },
        }),
        this.prisma.auditLog.create({
          data: {
            action: 'PAYMENT_CAPTURED',
            entity: 'Payment',
            entityId: payment.id,
            after: { razorpayPaymentId: entity.id, status: PaymentStatus.CAPTURED },
          },
        }),
      ]);

      // Transfer food amount (total - platform fee) to vendor via Razorpay Route
      await this.transferToVendor(entity.id, order.shopId, order.id, order.totalAmount, order.tokenAmount);

      this.events.emitOrderStatusChanged(order.id, { status: OrderStatus.QUEUED });
      this.events.emitQueueNewOrder(order.shopId, { orderId: order.id, tokenDisplay, totalAmount: order.totalAmount });

      const position = await this.ordersService.computePosition(order.shopId, new Date());
      this.notifications.notifyQueueJoined(order.customerId, order.id, tokenDisplay, position, 0).catch(() => {});
      this.notifications.notifyPaymentSuccess(order.customerId, order.id, String(payment.amount)).catch(() => {});
    } else {
      // REMAINING payment path kept for backward compatibility — not used in new flow (remainingAmount = 0)
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            razorpayPaymentId: entity.id,
            status: PaymentStatus.CAPTURED,
            capturedAt: now,
            webhookPayload: entity as object,
          },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.COMPLETED,
            paidAmount: { increment: payment.amount },
          },
        }),
        this.prisma.auditLog.create({
          data: {
            action: 'PAYMENT_CAPTURED',
            entity: 'Payment',
            entityId: payment.id,
            after: { razorpayPaymentId: entity.id, type: PaymentType.REMAINING },
          },
        }),
      ]);

      this.events.emitOrderStatusChanged(order.id, { status: OrderStatus.COMPLETED });
      this.notifications.notifyPaymentSuccess(order.customerId, order.id, String(payment.amount)).catch(() => {});
      this.notifications.notifyOrderCompleted(order.customerId, order.id).catch(() => {});
    }
  }

  private async onPaymentFailed(entity: { id: string; order_id: string }) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: entity.order_id },
    });
    if (!payment || payment.status !== PaymentStatus.PENDING) return;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          webhookPayload: entity as object,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'PAYMENT_FAILED',
          entity: 'Payment',
          entityId: payment.id,
          after: { razorpayPaymentId: entity.id },
        },
      }),
    ]);
  }

  private async onRefundProcessed(entity: { id: string; payment_id: string }) {
    const refund = await this.prisma.refund.findUnique({
      where: { razorpayRefundId: entity.id },
      include: { order: { select: { customerId: true } } },
    });
    if (!refund || refund.status === RefundStatus.PROCESSED) return;

    await this.prisma.$transaction([
      this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.PROCESSED, processedAt: new Date() },
      }),
      this.prisma.payment.update({
        where: { id: refund.paymentId },
        data: { status: PaymentStatus.REFUNDED },
      }),
      this.prisma.order.update({
        where: { id: refund.orderId },
        data: { status: OrderStatus.REFUNDED },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'REFUND_PROCESSED',
          entity: 'Refund',
          entityId: refund.id,
          after: { razorpayRefundId: entity.id },
        },
      }),
    ]);

    this.notifications.notifyRefundProcessed(refund.order.customerId, refund.orderId, String(refund.amount)).catch(() => {});
  }

  private async transferToVendor(
    razorpayPaymentId: string,
    shopId: string,
    orderId: string,
    totalAmount: unknown,
    platformFee: unknown,
  ) {
    try {
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        include: { vendor: { select: { razorpayAccountId: true } } },
      });

      if (!shop?.vendor?.razorpayAccountId) {
        this.logger.warn(`Vendor for shop ${shopId} has no Razorpay account — skipping Route transfer for order ${orderId}`);
        return;
      }

      const foodAmountPaise = Math.round((Number(totalAmount) - Number(platformFee)) * 100);
      if (foodAmountPaise <= 0) return;

      await (this.razorpay.payments as any).transfer(razorpayPaymentId, {
        transfers: [
          {
            account: shop.vendor.razorpayAccountId,
            amount: foodAmountPaise,
            currency: 'INR',
            notes: { orderId },
            on_hold: 0,
          },
        ],
      });

      this.logger.log(`Transferred ${foodAmountPaise} paise to vendor ${shop.vendor.razorpayAccountId} for order ${orderId}`);
    } catch (err) {
      this.logger.error(`Razorpay Route transfer failed for order ${orderId}: ${(err as Error).message}`);
    }
  }

  private async nextTokenNumber(shopId: string): Promise<{ nextToken: number; tokenDisplay: string }> {
    const agg = await this.prisma.queueEntry.aggregate({
      where: { shopId },
      _max: { tokenNumber: true },
    });
    const nextToken = (agg._max.tokenNumber ?? 0) + 1;
    return { nextToken, tokenDisplay: 'A' + String(nextToken).padStart(3, '0') };
  }

  private buildPaymentResponse(payment: { razorpayOrderId: string; amount: unknown; type: string }) {
    return {
      razorpayOrderId: payment.razorpayOrderId,
      amount: payment.amount,
      currency: 'INR',
      type: payment.type,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }
}
