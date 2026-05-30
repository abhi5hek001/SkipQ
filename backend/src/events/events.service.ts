import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class EventsService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitOrderStatusChanged(orderId: string, data: {
    status: string;
    queuePosition?: number | null;
    estimatedWaitMins?: number | null;
  }) {
    this.server?.to(`order:${orderId}`).emit('order.status_changed', { orderId, ...data });
  }

  emitQueueNewOrder(shopId: string, data: {
    orderId: string;
    tokenDisplay: string;
    totalAmount: unknown;
    customerPhone?: string;
  }) {
    this.server?.to(`shop:${shopId}`).emit('queue.new_order', { shopId, ...data });
  }

  emitQueueOrderUpdated(shopId: string, data: { orderId: string; status: string }) {
    this.server?.to(`shop:${shopId}`).emit('queue.order_updated', { shopId, ...data });
  }
}
