import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateShopDto) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vendor profile required');
    return this.prisma.shop.create({ data: { vendorId: vendor.id, ...dto } });
  }

  async findOne(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        categories: { orderBy: { sortOrder: 'asc' } },
        menuItems: { where: { isAvailable: true }, orderBy: { name: 'asc' } },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(userId: string, shopId: string, dto: UpdateShopDto) {
    await this.assertOwnership(userId, shopId);
    return this.prisma.shop.update({ where: { id: shopId }, data: dto });
  }

  // Shared helper — called by ShopsService, CategoriesService, MenuService
  async assertOwnership(userId: string, shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { vendor: { select: { userId: true } } },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.vendor.userId !== userId) throw new ForbiddenException('Not your shop');
  }
}
