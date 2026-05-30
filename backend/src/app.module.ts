import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VendorsModule } from './vendors/vendors.module';
import { ShopsModule } from './shops/shops.module';
import { CategoriesModule } from './categories/categories.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { QueueModule } from './queue/queue.module';
import { PaymentsModule } from './payments/payments.module';
import { EventsModule } from './events/events.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    VendorsModule,
    ShopsModule,
    CategoriesModule,
    MenuModule,
    OrdersModule,
    QueueModule,
    PaymentsModule,
    EventsModule,
    // Coming next: NotificationsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
