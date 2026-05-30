import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { ShopsService } from '../shops/shops.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

export interface BulkRowResult {
  rowIndex: number;
  name: string;
  description?: string;
  category?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  errors: string[];
  isDuplicate: boolean;
}

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
  ) {}

  async create(userId: string, dto: CreateMenuItemDto) {
    await this.shops.assertOwnership(userId, dto.shopId);
    return this.prisma.menuItem.create({ data: dto });
  }

  async findByShop(shopId: string) {
    return this.prisma.menuItem.findMany({
      where: { shopId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async update(userId: string, itemId: string, dto: UpdateMenuItemDto) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Menu item not found');
    await this.shops.assertOwnership(userId, item.shopId);
    return this.prisma.menuItem.update({ where: { id: itemId }, data: dto });
  }

  async remove(userId: string, itemId: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Menu item not found');
    await this.shops.assertOwnership(userId, item.shopId);
    await this.prisma.menuItem.delete({ where: { id: itemId } });
  }

  async bulkImport(userId: string, shopId: string, fileBuffer: Buffer, commit: boolean) {
    await this.shops.assertOwnership(userId, shopId);

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) throw new BadRequestException('File is empty');

    // Fetch existing item names for duplicate detection
    const existing = await this.prisma.menuItem.findMany({
      where: { shopId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((i) => i.name.toLowerCase()));

    const parsed: BulkRowResult[] = rows.map((row, i) => {
      const errors: string[] = [];
      const name = String(row['Item Name'] ?? row['name'] ?? '').trim();
      const priceRaw = row['Price'] ?? row['price'];
      const price = Number(priceRaw);
      const availRaw = row['Availability'] ?? row['isAvailable'];

      if (!name) errors.push('name is required');
      if (!priceRaw && priceRaw !== 0) errors.push('price is required');
      else if (isNaN(price) || price <= 0) errors.push('price must be a positive number');

      return {
        rowIndex: i + 2, // 1-based, row 1 is header
        name,
        description: String(row['Description'] ?? row['description'] ?? '').trim() || undefined,
        category: String(row['Category'] ?? row['category'] ?? '').trim() || undefined,
        price,
        imageUrl: String(row['Image URL'] ?? row['imageUrl'] ?? '').trim() || undefined,
        isAvailable: String(availRaw).toLowerCase() !== 'false' && availRaw !== '0' && availRaw !== 0,
        errors,
        isDuplicate: !!name && existingNames.has(name.toLowerCase()),
      };
    });

    const validRows = parsed.filter((r) => r.errors.length === 0 && !r.isDuplicate);
    const summary = {
      total: parsed.length,
      valid: validRows.length,
      invalid: parsed.filter((r) => r.errors.length > 0).length,
      duplicates: parsed.filter((r) => r.isDuplicate).length,
      rows: parsed,
      committed: false,
    };

    if (!commit) return summary;

    // Resolve or create categories
    const categoryCache = new Map<string, string>();
    for (const row of validRows) {
      if (row.category && !categoryCache.has(row.category)) {
        const cat = await this.prisma.category.upsert({
          where: { shopId_name: { shopId, name: row.category } },
          update: {},
          create: { shopId, name: row.category },
        });
        categoryCache.set(row.category, cat.id);
      }
    }

    await this.prisma.menuItem.createMany({
      data: validRows.map((r) => ({
        shopId,
        categoryId: r.category ? categoryCache.get(r.category) : undefined,
        name: r.name,
        description: r.description,
        price: r.price,
        imageUrl: r.imageUrl,
        isAvailable: r.isAvailable,
      })),
    });

    return { ...summary, committed: true };
  }
}
