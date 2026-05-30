import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopsService } from '../shops/shops.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
  ) {}

  async create(userId: string, dto: CreateCategoryDto) {
    await this.shops.assertOwnership(userId, dto.shopId);
    return this.prisma.category.create({ data: dto });
  }

  async findByShop(shopId: string) {
    return this.prisma.category.findMany({
      where: { shopId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async update(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');
    await this.shops.assertOwnership(userId, category.shopId);
    return this.prisma.category.update({ where: { id: categoryId }, data: dto });
  }

  async remove(userId: string, categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');
    await this.shops.assertOwnership(userId, category.shopId);
    await this.prisma.category.delete({ where: { id: categoryId } });
  }
}
