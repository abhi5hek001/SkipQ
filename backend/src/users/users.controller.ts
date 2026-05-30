import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch('me/fcm-token')
  updateFcmToken(@CurrentUser() user: any, @Body() dto: UpdateFcmTokenDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: { fcmToken: dto.fcmToken },
      select: { id: true, phone: true, role: true },
    });
  }
}
