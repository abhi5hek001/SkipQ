import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    // Feature modules added phase by phase:
    // AuthModule, UsersModule, VendorsModule, ShopsModule,
    // CategoriesModule, MenuModule, OrdersModule, QueueModule,
    // PaymentsModule, NotificationsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
