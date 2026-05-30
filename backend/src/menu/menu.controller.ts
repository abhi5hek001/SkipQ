import {
  Controller, Post, Get, Patch, Delete,
  Body, Param, Query, UseGuards, UseInterceptors,
  UploadedFile, HttpCode, HttpStatus, ParseBoolPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  create(@CurrentUser() user: any, @Body() dto: CreateMenuItemDto) {
    return this.menuService.create(user.id, dto);
  }

  @Get()
  findByShop(@Query('shopId') shopId: string) {
    return this.menuService.findByShop(shopId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuService.update(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.menuService.remove(user.id, id);
  }

  // commit=false → dry run (preview + validation), commit=true → import
  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @UseInterceptors(FileInterceptor('file'))
  bulkImport(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('commit', new ParseBoolPipe({ optional: true })) commit: boolean = false,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.menuService.bulkImport(user.id, shopId, file.buffer, commit);
  }
}
