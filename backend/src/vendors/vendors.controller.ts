import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post('register')
  register(@CurrentUser() user: any, @Body() dto: CreateVendorDto) {
    return this.vendorsService.register(user.id, dto);
  }

  @Get('me')
  getMyProfile(@CurrentUser() user: any) {
    return this.vendorsService.getMyProfile(user.id);
  }

  @Patch('settings')
  updateSettings(@CurrentUser() user: any, @Body() body: { razorpayAccountId?: string }) {
    return this.vendorsService.updateSettings(user.id, body);
  }
}
