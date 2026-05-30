import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEvent } from '@prisma/client';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (admin.apps.length > 0) return; // guard against double-init in hot reload

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // .env stores \n as literal backslash-n; replace before passing to SDK
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });

    this.logger.log('Firebase Admin initialized');
  }

  async send(params: {
    userId: string;
    event: NotificationEvent;
    title: string;
    body: string;
    orderId?: string;
  }) {
    const { userId, event, title, body, orderId } = params;

    const notification = await this.prisma.notification.create({
      data: { userId, event, title, body, orderId },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) return;

    try {
      await admin.messaging().send({
        token: user.fcmToken,
        notification: { title, body },
        data: { event, orderId: orderId ?? '' },
      });

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sent: true, sentAt: new Date() },
      });
    } catch (err: unknown) {
      // FCM failure must not break the caller — log and move on
      this.logger.warn(`FCM send failed for user ${userId}: ${(err as Error).message}`);
    }
  }

  // Convenience methods per event type

  async notifyQueueJoined(userId: string, orderId: string, tokenDisplay: string, position: number, waitMins: number) {
    await this.send({
      userId, orderId,
      event: NotificationEvent.QUEUE_JOINED,
      title: 'You joined the queue',
      body: `Token ${tokenDisplay} — position #${position + 1}. Est. wait: ${waitMins} min`,
    });
  }

  async notifyOrderAccepted(userId: string, orderId: string) {
    await this.send({
      userId, orderId,
      event: NotificationEvent.ORDER_ACCEPTED,
      title: 'Order accepted',
      body: 'The vendor has accepted your order.',
    });
  }

  async notifyPreparationStarted(userId: string, orderId: string) {
    await this.send({
      userId, orderId,
      event: NotificationEvent.PREPARATION_STARTED,
      title: 'Being prepared',
      body: 'Your order is being prepared right now.',
    });
  }

  async notifyReadyForPickup(userId: string, orderId: string) {
    await this.send({
      userId, orderId,
      event: NotificationEvent.READY_FOR_PICKUP,
      title: 'Ready for pickup',
      body: 'Your order is ready. Head over now!',
    });
  }

  async notifyOrderCompleted(userId: string, orderId: string) {
    await this.send({
      userId, orderId,
      event: NotificationEvent.ORDER_COMPLETED,
      title: 'Order complete',
      body: 'Enjoy your meal!',
    });
  }

  async notifyPaymentSuccess(userId: string, orderId: string, amount: string) {
    await this.send({
      userId, orderId,
      event: NotificationEvent.PAYMENT_SUCCESS,
      title: 'Payment successful',
      body: `Payment of Rs. ${amount} received.`,
    });
  }

  async notifyRefundProcessed(userId: string, orderId: string, amount: string) {
    await this.send({
      userId, orderId,
      event: NotificationEvent.REFUND_PROCESSED,
      title: 'Refund processed',
      body: `Rs. ${amount} has been refunded to your account.`,
    });
  }
}
