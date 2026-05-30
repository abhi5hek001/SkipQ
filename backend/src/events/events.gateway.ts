import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { EventsService } from './events.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.eventsService.setServer(server);
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined
      ?? client.handshake.query?.token as string | undefined;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Customer joins to track their specific order
  @SubscribeMessage('join_order')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!data?.orderId) return;
    client.join(`order:${data.orderId}`);
    client.emit('joined', { room: `order:${data.orderId}` });
  }

  // Vendor joins to watch their shop queue
  @SubscribeMessage('join_shop')
  handleJoinShop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { shopId: string },
  ) {
    if (!data?.shopId) return;
    client.join(`shop:${data.shopId}`);
    client.emit('joined', { room: `shop:${data.shopId}` });
  }

  @SubscribeMessage('leave_order')
  handleLeaveOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (data?.orderId) client.leave(`order:${data.orderId}`);
  }

  @SubscribeMessage('leave_shop')
  handleLeaveShop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { shopId: string },
  ) {
    if (data?.shopId) client.leave(`shop:${data.shopId}`);
  }
}
