import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

// In-memory OTP store: phone → { otp, expiresAt }
// Production: replace with Redis
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, expiresAt: Date.now() + this.OTP_TTL_MS });

    // Mock: log to console. Swap this block for Twilio/MSG91 in production.
    this.logger.log(`[MOCK OTP] phone=${phone} otp=${otp}`);

    return { message: 'OTP sent' };
  }

  async verifyOtp(phone: string, otp: string): Promise<{ accessToken: string }> {
    const record = otpStore.get(phone);

    if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    otpStore.delete(phone);

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, role: UserRole.CUSTOMER },
    });

    const accessToken = this.jwt.sign({ sub: user.id, phone: user.phone, role: user.role });
    return { accessToken };
  }
}
