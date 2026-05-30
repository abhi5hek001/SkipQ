import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Vendor profile already exists');

    const emailTaken = await this.prisma.vendor.findUnique({ where: { email: dto.email } });
    if (emailTaken) throw new ConflictException('Email already registered');

    const [vendor] = await this.prisma.$transaction([
      this.prisma.vendor.create({ data: { userId, ...dto } }),
      this.prisma.user.update({ where: { id: userId }, data: { role: UserRole.VENDOR } }),
    ]);

    return vendor;
  }

  async getMyProfile(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      include: { shops: { select: { id: true, name: true, isOpen: true, tokenAmount: true, avgPrepTimeMins: true } } },
    });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    return vendor;
  }

  async updateSettings(userId: string, dto: { razorpayAccountId?: string }) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    return this.prisma.vendor.update({
      where: { userId },
      data: { razorpayAccountId: dto.razorpayAccountId },
    });
  }
}
